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

const readErrorCode = (payload = {}) => payload.code || payload.errorCode || '';
const readRequestId = (response = {}) => {
  const header = response.header || {};
  return response.requestId || header['X-Cloudbase-Request-Id'] || header['X-Request-Id'] || '';
};

const messageForError = (statusCode, code, payload = {}) => {
  if (code === 'INVALID_HOST') return '云开发环境未关联当前小程序，请完成小程序认证后重试';
  if (statusCode === 401) return '登录已过期，请重新登录';
  if (statusCode === 403) return '当前账号没有执行此操作的权限';
  if (statusCode === 404) return '服务地址不存在，请稍后重试';
  if (statusCode === 429) return '操作过于频繁，请稍后再试';
  if (statusCode >= 500) return '服务暂时不可用，请稍后重试';
  return payload.error || payload.message || `请求失败 (${statusCode || '网络异常'})`;
};

const toRequestError = (response = {}) => {
  const payload = response.data || response;
  const statusCode = response.statusCode || 0;
  const code = readErrorCode(payload);
  return new RequestError(messageForError(statusCode, code, payload), {
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
  if (!silent) wx.showToast({ title: error.message || '网络连接失败，请检查网络', icon: 'none', duration: 2200 });
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
      if (error.statusCode === 401) handleAuthError();
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
      retryOrReject(toRequestError(response));
    };

    const handleFail = (error) => {
      const normalized = toRequestError({
        statusCode: error && error.statusCode,
        header: error && error.header,
        requestId: error && error.requestId,
        data: error || {},
      });
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
  const config = getEnvConfig();
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
    const requestError = toRequestError({
      statusCode: error && error.statusCode,
      header: error && error.header,
      requestId: error && error.requestId,
      data: error || {},
    });
    if (!requestError.code && !requestError.statusCode) requestError.message = '上传失败，请检查网络后重试';
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

  if (config.useCloudContainer && config.env && wx.cloud) {
    wx.cloud.callContainer({
      config: { env: config.env }, path: options.url, method: 'POST',
      header: { 'X-WX-SERVICE': config.serviceName, 'content-type': 'multipart/form-data', ...header },
      filePath: options.filePath, name: options.name || 'file', formData: options.formData || {},
      success: handleSuccess, fail: handleFail,
    });
    return;
  }
  wx.uploadFile({
    url: `${getBaseUrl()}${options.url}`, filePath: options.filePath, name: options.name || 'file',
    formData: options.formData || {}, header, timeout: options.timeout || 30000,
    success: handleSuccess, fail: handleFail,
  });
});

module.exports = { request, uploadFile, RequestError };
