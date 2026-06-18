const { request } = require('./request');

const TOKEN_KEY = 'auth_token';
const TEACHER_ID_KEY = 'currentTeacherId';
const USER_ID_KEY = 'currentUserId';
const USER_ROLE_KEY = 'currentUserRole';

const loginWithWechat = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (loginRes) => {
        const code = loginRes.code;
        if (!code) {
          reject(new Error('wx.login failed'));
          return;
        }
        request({
          url: '/api/mp/auth/login',
          method: 'POST',
          data: { code },
        })
          .then((data) => {
            wx.setStorageSync(TOKEN_KEY, data.token);
            wx.setStorageSync(USER_ID_KEY, data.userId);
            wx.setStorageSync(USER_ROLE_KEY, data.role);
            if (data.teacherId) {
              wx.setStorageSync(TEACHER_ID_KEY, data.teacherId);
            }
            const app = getApp();
            if (app && app.globalData) {
              app.globalData.teacherId = data.teacherId;
              app.globalData.userId = data.userId;
            }
            resolve(data);
          })
          .catch(reject);
      },
      fail: () => reject(new Error('wx.login failed')),
    });
  });
};

const getToken = () => {
  return wx.getStorageSync(TOKEN_KEY) || '';
};

const getTeacherId = () => {
  const stored = wx.getStorageSync(TEACHER_ID_KEY);
  if (stored) return stored;
  const app = typeof getApp === 'function' ? getApp() : null;
  return (app && app.globalData && app.globalData.teacherId) || null;
};

const isTeacher = () => {
  return !!getTeacherId();
};

const isLoggedIn = () => {
  return !!getToken();
};

const logout = () => {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(TEACHER_ID_KEY);
  wx.removeStorageSync(USER_ID_KEY);
  wx.removeStorageSync(USER_ROLE_KEY);
};

module.exports = { loginWithWechat, getToken, getTeacherId, isTeacher, isLoggedIn, logout };
