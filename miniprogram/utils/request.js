const { mockResponse } = require('./mock-data');

const ENV_CONFIG = {
  dev: {
    baseUrl: 'http://127.0.0.1:5000',
    useCloudContainer: false,
  },
  prod: {
    env: '',
    serviceName: 'xile-yoga',
    useCloudContainer: true,
  },
};

const MAX_RETRY = 2;
const RETRY_DELAY = 1000;

const getEnvConfig = () => {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData && app.globalData.cloudEnv) {
    return {
      ...ENV_CONFIG.prod,
      env: app.globalData.cloudEnv,
    };
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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const isNetworkError = (err) => {
  if (!err) return true;
  const msg = (err.errMsg || err.message || '').toLowerCase();
  return msg.includes('timeout') || msg.includes('fail') || msg.includes('network');
};

let _authHandling = false;

const handleAuthError = () => {
  if (_authHandling) return;
  _authHandling = true;
  wx.removeStorageSync('auth_token');
  wx.removeStorageSync('currentTeacherId');
  wx.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 });
  setTimeout(() => {
    _authHandling = false;
    wx.reLaunch({ url: '/pages/index/index' });
  }, 1500);
};

const showNetworkError = (silent) => {
  if (!silent) {
    wx.showToast({ title: '网络连接失败，请检查网络', icon: 'none', duration: 2000 });
  }
};

const request = (options) => {
  const silent = options.silent || false;
  const retryCount = options._retry || 0;

  return new Promise((resolve, reject) => {
    const method = options.method || 'GET';
    const config = getEnvConfig();

    const fallback = () => {
      if (config.useCloudContainer) {
        reject(new Error(`request failed: ${options.url}`));
        return;
      }
      const mocked = mockResponse(options.url, { method, data: options.data });
      if (mocked) {
        resolve(mocked);
      } else {
        reject(new Error(`request failed: ${options.url}`));
      }
    };

    const handleResponse = (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(res.data);
      } else if (res.statusCode === 401) {
        handleAuthError();
        reject(new Error('登录已过期'));
      } else if (res.statusCode >= 500 && retryCount < MAX_RETRY) {
        delay(RETRY_DELAY * (retryCount + 1)).then(() => {
          request({ ...options, _retry: retryCount + 1 }).then(resolve).catch(reject);
        });
      } else {
        const errMsg = (res.data && res.data.error) || `请求失败 (${res.statusCode})`;
        if (!silent) {
          wx.showToast({ title: errMsg, icon: 'none', duration: 2000 });
        }
        fallback();
      }
    };

    const handleFail = (err) => {
      if (isNetworkError(err) && retryCount < MAX_RETRY) {
        delay(RETRY_DELAY * (retryCount + 1)).then(() => {
          request({ ...options, _retry: retryCount + 1 }).then(resolve).catch(reject);
        });
      } else {
        showNetworkError(silent);
        fallback();
      }
    };

    if (config.useCloudContainer && config.env) {
      wx.cloud.callContainer({
        config: { env: config.env },
        path: options.url,
        method,
        header: {
          'X-WX-SERVICE': config.serviceName,
          ...getAuthHeader(),
          ...(options.header || {}),
        },
        data: options.data,
        success: handleResponse,
        fail: handleFail,
      });
    } else {
      wx.request({
        ...options,
        method,
        url: `${getBaseUrl()}${options.url}`,
        header: { ...getAuthHeader(), ...(options.header || {}) },
        timeout: options.timeout || 15000,
        success: handleResponse,
        fail: handleFail,
      });
    }
  });
};

const uploadFile = (options) => {
  return new Promise((resolve, reject) => {
    const config = getEnvConfig();
    const header = { ...getAuthHeader(), ...(options.header || {}) };

    const handleSuccess = (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          resolve(JSON.parse(res.data));
        } catch (e) {
          resolve(res.data);
        }
      } else if (res.statusCode === 401) {
        handleAuthError();
        reject(new Error('登录已过期'));
      } else {
        reject(new Error(`上传失败 (${res.statusCode})`));
      }
    };

    const handleFail = (err) => {
      showNetworkError(false);
      reject(err);
    };

    if (config.useCloudContainer && config.env) {
      wx.cloud.callContainer({
        config: { env: config.env },
        path: options.url,
        method: 'POST',
        header: {
          'X-WX-SERVICE': config.serviceName,
          'content-type': 'multipart/form-data',
          ...header,
        },
        filePath: options.filePath,
        name: options.name || 'file',
        formData: options.formData || {},
        success: handleSuccess,
        fail: handleFail,
      });
    } else {
      wx.uploadFile({
        url: `${getBaseUrl()}${options.url}`,
        filePath: options.filePath,
        name: options.name || 'file',
        formData: options.formData || {},
        header,
        timeout: options.timeout || 30000,
        success: handleSuccess,
        fail: handleFail,
      });
    }
  });
};

module.exports = { request, uploadFile };
