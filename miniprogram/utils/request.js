const DEFAULT_BASE_URL = 'http://127.0.0.1:5000';
const { mockResponse } = require('./mock-data');

const getBaseUrl = () => {
  const app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData && app.globalData.apiBaseUrl) || DEFAULT_BASE_URL;
};

const getAuthHeader = () => {
  const token = wx.getStorageSync('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = (options) => {
  return new Promise((resolve, reject) => {
    const method = options.method || 'GET';
    const fallback = () => {
      const mocked = mockResponse(options.url, { method, data: options.data });
      if (mocked) {
        resolve(mocked);
      } else {
        reject(new Error(`request failed: ${options.url}`));
      }
    };

    wx.request({
      ...options,
      method,
      url: `${getBaseUrl()}${options.url}`,
      header: { ...getAuthHeader(), ...(options.header || {}) },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          fallback();
        }
      },
      fail: fallback,
    });
  });
};

module.exports = { request };
