const { request } = require('./request');

const TOKEN_KEY = 'auth_token';
const TEACHER_ID_KEY = 'currentTeacherId';
const USER_ID_KEY = 'currentUserId';
const USER_ROLE_KEY = 'currentUserRole';
const PHONE_BOUND_KEY = 'phoneBound';
const AVATAR_URL_KEY = 'userAvatarUrl';
const NICKNAME_KEY = 'userNickname';

const applySession = (data) => {
  if (!data || !data.token) throw new Error('登录响应无效，请重试');
  wx.setStorageSync(TOKEN_KEY, data.token);
  wx.setStorageSync(USER_ID_KEY, data.userId);
  wx.setStorageSync(USER_ROLE_KEY, data.role || 'student');
  wx.setStorageSync(PHONE_BOUND_KEY, !!data.phoneBound);
  if (data.avatarUrl) wx.setStorageSync(AVATAR_URL_KEY, data.avatarUrl);
  if (data.nickname) wx.setStorageSync(NICKNAME_KEY, data.nickname);
  if (data.teacherId) wx.setStorageSync(TEACHER_ID_KEY, data.teacherId);
  else wx.removeStorageSync(TEACHER_ID_KEY);

  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.teacherId = data.teacherId || null;
    app.globalData.userId = data.userId || null;
    app.globalData.phoneBound = !!data.phoneBound;
    app.globalData.avatarUrl = data.avatarUrl || '';
    app.globalData.nickname = data.nickname || '';
  }
};

const loginWithWechat = () => {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.callFunction) {
      reject(new Error('当前微信版本不支持云开发登录'));
      return;
    }
    wx.cloud.callFunction({
      name: 'mp-auth-bridge',
      data: {},
      success: (result) => {
        const assertion = result && result.result;
        if (!assertion || !assertion.signature) {
          reject(new Error('微信身份校验失败，请重试'));
          return;
        }
        request({
          url: '/api/mp/auth/cloudbase-login',
          method: 'POST',
          data: { assertion },
        }).then((data) => {
          applySession(data);
          resolve(data);
        }).catch(reject);
      },
      fail: (error) => {
        console.warn('CloudBase auth bridge failed', error && error.errMsg);
        reject(new Error('微信身份校验暂不可用，请稍后重试'));
      },
    });
  });
};

const loginWithPassword = (username, password) => request({
  url: '/api/mp/auth/password-login',
  method: 'POST',
  data: { username, password },
}).then((data) => {
  applySession({ ...data, phoneBound: true });
  return data;
});

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

const setTeacherIdentity = (teacherId, role) => {
  if (teacherId) wx.setStorageSync(TEACHER_ID_KEY, teacherId);
  else wx.removeStorageSync(TEACHER_ID_KEY);
  wx.setStorageSync(USER_ROLE_KEY, role || (teacherId ? 'teacher' : 'student'));
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) app.globalData.teacherId = teacherId || null;
};

const loginUrl = (pagePath) => `/packageTeacher/login/login?returnUrl=${encodeURIComponent(pagePath)}`;

const requireLogin = (pagePath) => {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData && !app.globalData.loginReady) {
    const promise = app.globalData.loginPromise || Promise.resolve();
    promise.then(() => {
      if (!isLoggedIn()) wx.redirectTo({ url: loginUrl(pagePath) });
    });
    return false;
  }
  if (!isLoggedIn()) {
    wx.redirectTo({ url: loginUrl(pagePath) });
    return false;
  }
  return true;
};

const requireAuth = (pagePath) => {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData && !app.globalData.loginReady) {
    const promise = app.globalData.loginPromise || Promise.resolve();
    promise.then(() => {
      if (!isLoggedIn() || !isTeacher()) {
        wx.redirectTo({ url: loginUrl(pagePath) });
      }
    });
    return false;
  }
  if (!isLoggedIn() || !isTeacher()) {
    wx.redirectTo({ url: loginUrl(pagePath) });
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
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.teacherId = null;
    app.globalData.userId = null;
    app.globalData.phoneBound = false;
    app.globalData.avatarUrl = '';
    app.globalData.nickname = '';
  }
};

module.exports = {
  loginWithWechat,
  loginWithPassword,
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
  setTeacherIdentity,
  loginUrl,
  requireLogin,
  requireAuth,
  logout,
};
