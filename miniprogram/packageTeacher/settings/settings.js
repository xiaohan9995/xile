const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

// WeChat profile images (qlogo.cn) are proxied through the backend so the
// mini program image list need not whitelist the qlogo domain. Local-storage
// avatars come back as API-relative paths ("/uploads/avatars/...") which the
// <image> tag cannot resolve — prefix the API base URL for those.
const displayAvatarUrl = (url) => {
  if (!url) return '';
  const baseUrl = app.globalData.apiBaseUrl || '';
  if (/^https:\/\/(?:thirdwx|wx)\.qlogo\.cn\//i.test(url)) {
    return baseUrl ? `${baseUrl}/api/mp/auth/avatar-proxy?url=${encodeURIComponent(url)}` : url;
  }
  if (/^https?:\/\//i.test(url)) return url;
  return baseUrl ? `${baseUrl}${url}` : url;
};

Page({
  data: {
    statusBarHeight: 20,
    themeColor: '#426d58',
    isTeacher: false,
    nickname: '',
    avatarUrl: '',
    avatarUploading: false,
    currentPassword: '',
    newPassword: '',
    changingPassword: false,
    mustChangePassword: false,
    forcePasswordChange: false,
    residencesText: '',
    teachingSummary: '',
    visibility: { showRealName: true, showAlias: true, showResidences: true, showBio: true, showFirstCertifiedOn: true, showCurrentTierCertifiedOn: true },
    savingPublicProfile: false,
  },

  onLoad(options) {
    if (!auth.requireLogin('/packageTeacher/settings/settings')) return;
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      forcePasswordChange: options.forcePasswordChange === '1',
    });
    this.loadUserInfo();
  },

  async loadUserInfo() {
    try {
      const data = await request({ url: '/api/mp/auth/me' });
      this.setData({
        isTeacher: !!data.teacherId,
        mustChangePassword: !!data.mustChangePassword,
        nickname: data.nickname || auth.getNickname() || '',
        avatarUrl: displayAvatarUrl(data.avatarUrl || auth.getAvatarUrl()),
      });
      if (data.teacherId && !data.mustChangePassword) this.loadPublicProfile();
    } catch (err) {
      this.setData({
        isTeacher: false,
      });
    }
  },

  onChooseAvatar(e) {
    const chosenUrl = e.detail && e.detail.avatarUrl;
    if (!chosenUrl || this.data.avatarUploading) return;

    this.setData({ avatarUploading: true });
    const fs = wx.getFileSystemManager();
    // wx.cloud.callContainer does not preserve multipart file fields, so the
    // image is read as base64 and posted as JSON (same flow as the profile page).
    new Promise((resolve, reject) => {
      fs.readFile({
        filePath: chosenUrl,
        encoding: 'base64',
        success: resolve,
        fail: reject,
      });
    })
      .then((file) => request({
        url: '/api/mp/auth/update-profile',
        method: 'POST',
        data: {
          nickname: this.data.nickname || '',
          avatarBase64: file.data,
          avatarFilename: 'avatar.jpg',
          avatarContentType: 'image/jpeg',
        },
      }))
      .then((res) => {
        const savedAvatarUrl = displayAvatarUrl(res.avatarUrl || chosenUrl);
        this.setData({ avatarUrl: savedAvatarUrl });
        auth.setAvatarUrl(savedAvatarUrl);
        wx.showToast({ title: '头像已更新', icon: 'none' });
      })
      .catch(() => {
        wx.showToast({ title: '头像上传失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ avatarUploading: false });
      });
  },

  onPasswordInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value || '' });
  },

  async loadPublicProfile() {
    try {
      const profile = await request({ url: '/api/mp/teachers/me/public-profile', silent: true });
      this.setData({
        residencesText: (profile.residences || []).join('、'),
        teachingSummary: profile.teachingSummary || '',
        visibility: profile.visibility || this.data.visibility,
      });
    } catch (error) {
      wx.showToast({ title: error.message || '公开资料加载失败', icon: 'none' });
    }
  },

  onPublicInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value || '' }); },
  onVisibilityChange(e) { this.setData({ [`visibility.${e.currentTarget.dataset.field}`]: !!e.detail.value }); },

  async savePublicProfile() {
    this.setData({ savingPublicProfile: true });
    try {
      const residences = (this.data.residencesText || '').split(/[、,，]/).map((item) => item.trim()).filter(Boolean).slice(0, 3);
      const data = await request({
        url: '/api/mp/teachers/me/public-profile', method: 'PUT', silent: true,
        data: {
          residences,
          teachingSummary: this.data.teachingSummary,
          visibility: this.data.visibility,
        },
      });
      wx.showToast({ title: '公开资料已保存', icon: 'none' });
    } catch (error) {
      wx.showToast({ title: error.message || '公开资料保存失败', icon: 'none' });
    } finally { this.setData({ savingPublicProfile: false }); }
  },

  async changePassword() {
    if ((this.data.newPassword || '').length < 8) {
      wx.showToast({ title: '新密码至少 8 位', icon: 'none' });
      return;
    }
    this.setData({ changingPassword: true });
    try {
      const data = await request({
        url: '/api/mp/auth/change-password',
        method: 'POST',
        silent: true,
        data: {
          currentPassword: this.data.currentPassword,
          newPassword: this.data.newPassword,
        },
      });
      // Changing a password invalidates the old JWT on the server. Persist
      // the replacement token before navigating away from this page.
      auth.applySession(data);
      this.setData({ mustChangePassword: false });
      this.setData({ currentPassword: '', newPassword: '' });
      wx.showToast({ title: '密码已更新', icon: 'none' });
      if (this.data.forcePasswordChange) {
        setTimeout(() => wx.reLaunch({ url: '/packageTeacher/profile/profile' }), 500);
      }
    } catch (err) {
      const message = err.statusCode === 404
        ? '当前微信账号未设置教师登录密码'
        : (err.message || '密码更新失败');
      wx.showToast({ title: message, icon: 'none', duration: 2500 });
    } finally {
      this.setData({ changingPassword: false });
    }
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新使用微信登录，个人资料和认证记录不会被删除。',
      confirmText: '退出',
      confirmColor: '#c84b45',
      cancelText: '取消',
      success: (result) => {
        if (!result.confirm) return;
        auth.logout();
        wx.reLaunch({ url: '/pages/index/index' });
      },
    });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/pages/index/index' });
  },
});
