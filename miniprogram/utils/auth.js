const { request } = require('./request');

const TOKEN_KEY = 'auth_token';
const TEACHER_ID_KEY = 'currentTeacherId';
const USER_ID_KEY = 'currentUserId';
const USER_ROLE_KEY = 'currentUserRole';
const PHONE_BOUND_KEY = 'phoneBound';
const AVATAR_URL_KEY = 'userAvatarUrl';
const NICKNAME_KEY = 'userNickname';

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
            wx.setStorageSync(PHONE_BOUND_KEY, !!data.phoneBound);
            if (data.avatarUrl) {
              wx.setStorageSync(AVATAR_URL_KEY, data.avatarUrl);
            }
            if (data.nickname) {
              wx.setStorageSync(NICKNAME_KEY, data.nickname);
            }
            if (data.teacherId) {
              wx.setStorageSync(TEACHER_ID_KEY, data.teacherId);
            }
            const app = getApp();
            if (app && app.globalData) {
              app.globalData.teacherId = data.teacherId;
              app.globalData.userId = data.userId;
              app.globalData.phoneBound = !!data.phoneBound;
              app.globalData.avatarUrl = data.avatarUrl || '';
              app.globalData.nickname = data.nickname || '';
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

const isPhoneBound = () => {
  return wx.getStorageSync(PHONE_BOUND_KEY) === true;
};

const getRole = () => {
  return wx.getStorageSync(USER_ROLE_KEY) || 'student';
};

const getAvatarUrl = () => {
  return wx.getStorageSync(AVATAR_URL_KEY) || '';
};

const getNickname = () => {
  return wx.getStorageSync(NICKNAME_KEY) || '';
};

const setAvatarUrl = (url) => {
  wx.setStorageSync(AVATAR_URL_KEY, url || '');
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.avatarUrl = url || '';
  }
};

const setNickname = (name) => {
  wx.setStorageSync(NICKNAME_KEY, name || '');
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.nickname = name || '';
  }
};

const setPhoneBound = (value) => {
  wx.setStorageSync(PHONE_BOUND_KEY, !!value);
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.phoneBound = !!value;
  }
};

const requireAuth = (pagePath) => {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData && !app.globalData.loginReady) {
    const promise = app.globalData.loginPromise || Promise.resolve();
    promise.then(() => {
      if (!isLoggedIn() || !isPhoneBound()) {
        wx.redirectTo({
          url: `/packageTeacher/login/login?returnUrl=${encodeURIComponent(pagePath)}`,
        });
      }
    });
    return false;
  }
  if (!isLoggedIn() || !isPhoneBound()) {
    wx.redirectTo({
      url: `/packageTeacher/login/login?returnUrl=${encodeURIComponent(pagePath)}`,
    });
    return false;
  }
  return true;
};

const logout = () => {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(TEACHER_ID_KEY);
  wx.removeStorageSync(USER_ID_KEY);
  wx.removeStorageSync(USER_ROLE_KEY);
  wx.removeStorageSync(PHONE_BOUND_KEY);
  wx.removeStorageSync(AVATAR_URL_KEY);
  wx.removeStorageSync(NICKNAME_KEY);
};

module.exports = {
  loginWithWechat,
  getToken,
  getTeacherId,
  getRole,
  getAvatarUrl,
  getNickname,
  setAvatarUrl,
  setNickname,
  isTeacher,
  isLoggedIn,
  isPhoneBound,
  setPhoneBound,
  requireAuth,
  logout,
};
