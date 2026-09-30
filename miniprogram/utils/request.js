const { mockResponse } = require('./mock-data');

const ENV_CONFIG = {
  dev: { baseUrl: 'http://127.0.0.1:5001', useCloudContainer: false },
  prod: { env: 'xile-yoga-d4g2za8xi82a16810', serviceName: 'xile-yoga', useCloudContainer: true },
};

const MAX_RETRY = 2;
const RETRY_DELAY = 1000;
const RETRYABLE_METHODS = ['GET', 'HEAD'];

class RequestError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RequestError';
    this.code = details.code || '';
    this.statusCode = details.statusCode || 0;
    this.requestId = details.requestId || '';
  }
}

const getEnvConfig = () => {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData && app.globalData.cloudEnv) {
    return { ...ENV_CONFIG.prod, env: app.globalData.cloudEnv };
  }
  return ENV_CONFIG.dev;
};

const getBaseUrl = () => {
  const app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData && app.globalData.apiBaseUrl) || ENV_CONFIG.dev.baseUrl;
};

const getAuthHeader = () => {
  const token = wx.getStorageSync('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const canRetry = (method, retryCount) => RETRYABLE_METHODS.includes(method) && retryCount < MAX_RETRY;
const isAbsoluteHttpUrl = (url) => /^https?:\/\//i.test(url || '');

// 服务端 /api/mp/upload/cloud-file 的体积上限（8MB）。
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// 微信上传类 API 的失败信息在 errMsg / errCode 上（message 通常为空），
// 统一转成可读文案，避免用户只看到「图片上传失败」而无法判断原因。
const describeUploadFailure = (error, fallback = '图片上传失败，请重试') => {
  const raw = String((error && (error.errMsg || error.message)) || '').trim();
  const code = error && error.errCode;
  const lower = raw.toLowerCase();
  if (/timeout|time out/.test(lower)) return '上传超时，请检查网络后重试';
  if (code === -601002 || /env.*(not exist|不存在)|invalid env/.test(lower)) {
    return '云开发环境未绑定当前小程序，请联系管理员';
  }
  if (/exceed|too large|size limit|max size/.test(lower)) return '图片过大，请选择较小的图片后重试';
  if (code === -502005 || /permission|denied|forbidden/.test(lower)) return '没有上传权限，请重新登录后再试';
  if (/network|fail to fetch|request:fail/.test(lower)) return '网络连接失败，请检查网络后重试';
  return code ? `${fallback}（错误码 ${code}）` : fallback;
};

// 压缩图片；失败时返回空字符串，由调用方决定是否退回原图。
const compressImageTo = (src, quality) => new Promise((resolve) => {
  if (!wx.compressImage) {
    resolve('');
    return;
  }
  wx.compressImage({
    src,
    quality,
    compressedWidth: 1080,
    success: (res) => resolve((res && res.tempFilePath) || ''),
    fail: () => resolve(''),
  });
});

const fileSizeOf = (filePath) => new Promise((resolve) => {
  const fs = wx.getFileSystemManager && wx.getFileSystemManager();
  if (!fs || !fs.getFileInfo) {
    resolve(0);
    return;
  }
  fs.getFileInfo({
    filePath,
    success: (info) => resolve((info && info.size) || 0),
    fail: () => resolve(0),
  });
});

const readErrorCode = (payload = {}) => payload.code || payload.errorCode || '';
const readRequestId = (response = {}) => {
  const header = response.header || {};
  return response.requestId || header['X-Cloudbase-Request-Id'] || header['X-Request-Id'] || '';
};

// Backend and object-storage errors are not always returned in a consistent
// shape. Keep raw English/XML messages out of the user-facing mini program UI.
const normalizeUserMessage = (value, fallback = '操作失败，请稍后重试') => {
  const raw = String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (/image\s+too\s+large|file\s+too\s+large|entity\s+too\s+large|超过\s*8\s*mb/.test(lower)) return '图片不能超过8MB';
  if (/internal\s+server\s+error|server\s+error|服务器内部错误/.test(lower)) return '服务暂时不可用，请稍后重试';
  if (/accessdenied|access denied|forbidden|拒绝访问/.test(lower)) return '图片暂时无法访问，请稍后重试';
  if (/unauthorized|未授权/.test(lower)) return '登录已过期，请重新登录';
  if (/invalid\s+(username\s+or\s+password|credentials?)|用户名或密码错误/.test(lower)) return '身份证号或密码错误';
  if (/username\s+and\s+password\s+required|身份证号和密码.*(必填|请输入)/.test(lower)) return '请输入身份证号和密码';
  if (/network|timeout|网络|超时/.test(lower)) return '网络连接失败，请检查网络后重试';
  // Toasts should remain readable even if an upstream service returns a long
  // diagnostic string (request IDs and XML are not useful to end users).
  return raw.length > 32 ? fallback : raw;
};

// A 401 returned while submitting credentials means the credentials were not
// accepted. It is not an expired existing session and must not clear storage.
const isCredentialLoginRequest = (url = '') => (
  url === '/api/mp/auth/password-login'
  || url === '/api/mp/auth/cloudbase-login'
  || url === '/api/mp/auth/link-teacher-by-password'
);

const messageForError = (statusCode, code, payload = {}, options = {}) => {
  if (code === 'PASSWORD_CHANGE_REQUIRED') return '请先重置初始密码后再继续操作';
  if (code === 'INVALID_HOST') return '云开发环境未关联当前小程序，请完成小程序认证后重试';
  if (statusCode === 401 && isCredentialLoginRequest(options.url)) {
    return normalizeUserMessage(payload.error || payload.message, '身份证号或密码错误');
  }
  if (statusCode === 401) return '登录已过期，请重新登录';
  if (statusCode === 403) return '当前账号没有执行此操作的权限';
  if (statusCode === 404) return '服务地址不存在，请稍后重试';
  if (statusCode === 429) return '操作过于频繁，请稍后再试';
  if (statusCode >= 500) return '服务暂时不可用，请稍后重试';
  return normalizeUserMessage(payload.error || payload.message, `请求失败 (${statusCode || '网络异常'})`);
};

const toRequestError = (response = {}, options = {}) => {
  const payload = response.data || response;
  const statusCode = response.statusCode || 0;
  const code = readErrorCode(payload);
  return new RequestError(messageForError(statusCode, code, payload, options), {
    statusCode,
    code,
    requestId: readRequestId(response),
  });
};

let authHandling = false;
const handleAuthError = () => {
  if (authHandling) return;
  authHandling = true;
  wx.removeStorageSync('auth_token');
  wx.removeStorageSync('currentTeacherId');
  wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 });
  setTimeout(() => {
    authHandling = false;
    wx.reLaunch({ url: '/pages/index/index' });
  }, 1500);
};

const showError = (error, silent) => {
  if (!silent) wx.showToast({ title: normalizeUserMessage(error && error.message, '网络连接失败，请检查网络后重试'), icon: 'none', duration: 2200 });
};

const request = (options) => {
  const silent = !!options.silent;
  const retryCount = options._retry || 0;
  const method = (options.method || 'GET').toUpperCase();
  const config = getEnvConfig();
  const app = typeof getApp === 'function' ? getApp() : null;

  return new Promise((resolve, reject) => {
    if (app && app.globalData && app.globalData.cloudInitError) {
      const initError = new RequestError(app.globalData.cloudInitError);
      showError(initError, silent);
      reject(initError);
      return;
    }
    const retryOrReject = (error) => {
      if (canRetry(method, retryCount) && (error.statusCode === 0 || error.statusCode >= 500)) {
        delay(RETRY_DELAY * (retryCount + 1)).then(() => request({ ...options, _retry: retryCount + 1 }).then(resolve).catch(reject));
        return;
      }
      if (error.statusCode === 401 && !isCredentialLoginRequest(options.url)) handleAuthError();
      showError(error, silent);
      reject(error);
    };

    const fallbackOrReject = (error) => {
      const app = typeof getApp === 'function' ? getApp() : null;
      const canUseMock = !config.useCloudContainer && !!(app && app.globalData && app.globalData.useMockFallback);
      const mocked = canUseMock && mockResponse(options.url, { method, data: options.data });
      if (mocked) {
        resolve(mocked);
        return;
      }
      retryOrReject(error);
    };

    const handleResponse = (response) => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        resolve(response.data);
        return;
      }
      retryOrReject(toRequestError(response, options));
    };

    const handleFail = (error) => {
      const normalized = toRequestError({
        statusCode: error && error.statusCode,
        header: error && error.header,
        requestId: error && error.requestId,
        data: error || {},
      }, options);
      if (!normalized.code && !normalized.statusCode) normalized.message = '网络连接失败，请检查网络后重试';
      fallbackOrReject(normalized);
    };

    if (config.useCloudContainer && config.env && wx.cloud) {
      wx.cloud.callContainer({
        config: { env: config.env },
        path: options.url,
        method,
        header: { 'X-WX-SERVICE': config.serviceName, ...getAuthHeader(), ...(options.header || {}) },
        data: options.data,
        success: handleResponse,
        fail: handleFail,
      });
      return;
    }

    wx.request({
      ...options,
      method,
      url: `${getBaseUrl()}${options.url}`,
      header: { ...getAuthHeader(), ...(options.header || {}) },
      timeout: options.timeout || 15000,
      success: handleResponse,
      fail: handleFail,
    });
  });
};

const uploadFile = (options) => new Promise((resolve, reject) => {
  const header = { ...getAuthHeader(), ...(options.header || {}) };
  const handleSuccess = (response) => {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      try { resolve(JSON.parse(response.data)); } catch (error) { resolve(response.data); }
      return;
    }
    const requestError = toRequestError(response);
    if (requestError.statusCode === 401) handleAuthError();
    showError(requestError, false);
    reject(requestError);
  };
  const handleFail = (error) => {
    const requestError = new RequestError(
      describeUploadFailure(error, '上传失败，请检查网络后重试'),
      { statusCode: (error && error.statusCode) || 0, requestId: (error && error.requestId) || '' },
    );
    showError(requestError, false);
    reject(requestError);
  };

  // Presigned object-storage URLs must be uploaded directly. Routing them
  // through CloudRun both breaks the signature and unnecessarily exposes the
  // application JWT to a third-party upload endpoint.
  if (isAbsoluteHttpUrl(options.url)) {
    wx.uploadFile({
      url: options.url, filePath: options.filePath, name: options.name || 'file',
      formData: options.formData || {}, header: options.header || {}, timeout: options.timeout || 30000,
      success: handleSuccess, fail: handleFail,
    });
    return;
  }

  // wx.cloud.callContainer does NOT support multipart file upload (it has no
  // filePath parameter). File uploads must go through wx.uploadFile against the
  // public CloudRun origin, which getBaseUrl() already resolves to.
  wx.uploadFile({
    url: `${getBaseUrl()}${options.url}`, filePath: options.filePath, name: options.name || 'file',
    formData: options.formData || {}, header, timeout: options.timeout || 30000,
    success: handleSuccess, fail: handleFail,
  });
});

// 预签名直传 COS：后端返回 POST Object 表单字段（key/policy/q-signature 等），
// 前端用 wx.uploadFile 直传存储桶根地址，绕开未备案的 API 域名。
// 返回 { fileKey, url }，其中 url 为可预览的下载地址（签名 GET）。
const presignUpload = async (filePath, filename, prefix) => {
  const presign = await request({
    url: '/api/mp/upload/presign',
    method: 'POST',
    data: prefix ? { filename, prefix } : { filename },
  });
  if (presign.uploadUrl === '/api/mp/upload/file') {
    const result = await uploadFile({ url: '/api/mp/upload/file', filePath, name: 'file' });
    return { fileKey: result.fileKey || presign.fileKey, url: result.url || presign.publicUrl };
  }
  await uploadFile({ url: presign.uploadUrl, filePath, name: 'file', formData: presign.formData });
  return { fileKey: presign.fileKey, url: presign.downloadUrl || presign.publicUrl };
};

// 云存储直传：wx.cloud.uploadFile 走云开发私有通道，既不要求 ICP 备案域名，
// 也不受 wx.cloud.callContainer 100KB 请求体限制（图片 base64 必然超限）。
// 上传后取临时下载链接交给后端转存到业务 COS，展示逻辑（签名 URL）保持不变。
// 返回 { fileKey, url }，url 为可预览的签名下载地址。
const cloudUpload = async (filePath, filename, prefix) => {
  // 先压缩到 1080 宽减小体积；压缩失败则退回原图继续。
  let uploadPath = (await compressImageTo(filePath, 80)) || filePath;

  // 部分 Android 机型会忽略 compressedWidth，压缩后仍可能超过服务端上限，
  // 这里按实际体积再压一次；仍超限就直接提示，避免服务端返回 413。
  if ((await fileSizeOf(uploadPath)) > MAX_UPLOAD_BYTES) {
    const smaller = await compressImageTo(uploadPath, 60);
    if (smaller) uploadPath = smaller;
    if ((await fileSizeOf(uploadPath)) > MAX_UPLOAD_BYTES) {
      throw new Error('图片超过 8MB，请选择较小的图片后重试');
    }
  }

  const extMatch = (filename || '').match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const cloudPath = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const uploadRes = await new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath: uploadPath,
      success: resolve,
      fail: (error) => reject(new Error(describeUploadFailure(error, '云存储上传失败'))),
    });
  });
  const fileID = uploadRes && uploadRes.fileID;
  if (!fileID) throw new Error('云存储上传失败');

  const tmpRes = await new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: resolve,
      fail: (error) => reject(new Error(describeUploadFailure(error, '获取图片临时链接失败'))),
    });
  });
  const tempFileURL = tmpRes && tmpRes.fileList && tmpRes.fileList[0] && tmpRes.fileList[0].tempFileURL;
  if (!tempFileURL) throw new Error('获取图片临时链接失败');

  const result = await request({
    url: '/api/mp/upload/cloud-file',
    method: 'POST',
    data: { downloadUrl: tempFileURL, filename, prefix },
  });
  return { fileKey: result.fileKey, url: result.url };
};

module.exports = { request, uploadFile, presignUpload, cloudUpload, RequestError, normalizeUserMessage, describeUploadFailure };
