const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    nickname: '',
    xileName: '',
    isTeacher: false,
    savingNickname: false,
    currentPassword: '',
    newPassword: '',
    changingPassword: false,
    alias: '',
    residencesText: '',
    teachingSummary: '',
    currentTierCertifiedOn: '',
    visibility: { showAlias: false, showResidences: false, showBio: false, showFirstCertifiedOn: true, showCurrentTierCertifiedOn: true },
    savingPublicProfile: false,
  },

  onLoad() {
    if (!auth.requireLogin('/packageTeacher/settings/settings')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadUserInfo();
  },

  async loadUserInfo() {
    try {
      const data = await request({ url: '/api/mp/auth/me' });
      this.setData({
        nickname: data.xileName || '',
        xileName: data.xileName || '',
        isTeacher: !!data.teacherId,
      });
      if (data.teacherId) this.loadPublicProfile();
    } catch (err) {
      this.setData({
        nickname: '',
        xileName: '',
        isTeacher: false,
      });
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value || '' });
  },

  onPasswordInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value || '' });
  },

  async loadPublicProfile() {
    try {
      const profile = await request({ url: '/api/mp/teachers/me/public-profile', silent: true });
      this.setData({
        alias: profile.alias || '',
        residencesText: (profile.residences || []).join('、'),
        teachingSummary: profile.teachingSummary || '',
        currentTierCertifiedOn: profile.currentTierCertifiedOn || '',
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
      await request({
        url: '/api/mp/teachers/me/public-profile', method: 'PUT', silent: true,
        data: {
          alias: this.data.alias,
          residences,
          teachingSummary: this.data.teachingSummary,
          currentTierCertifiedOn: this.data.currentTierCertifiedOn,
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
      await request({
        url: '/api/mp/auth/change-password',
        method: 'POST',
        silent: true,
        data: {
          currentPassword: this.data.currentPassword,
          newPassword: this.data.newPassword,
        },
      });
      this.setData({ currentPassword: '', newPassword: '' });
      wx.showToast({ title: '密码已更新', icon: 'none' });
    } catch (err) {
      const message = err.statusCode === 404
        ? '当前微信账号未设置教师登录密码'
        : (err.message || '密码更新失败');
      wx.showToast({ title: message, icon: 'none', duration: 2500 });
    } finally {
      this.setData({ changingPassword: false });
    }
  },

  async onSaveNickname() {
    if (!this.data.isTeacher) return;
    const nickname = (this.data.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请填写喜乐名', icon: 'none' });
      return;
    }
    this.setData({ savingNickname: true });
    try {
      const res = await request({
        url: '/api/mp/auth/update-profile',
        method: 'POST',
        silent: true,
        data: { xileName: nickname },
      });
      this.setData({ nickname: res.xileName || nickname, xileName: res.xileName || nickname });
      wx.showToast({ title: '喜乐名已保存', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '喜乐名保存失败', icon: 'none' });
    } finally {
      this.setData({ savingNickname: false });
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
