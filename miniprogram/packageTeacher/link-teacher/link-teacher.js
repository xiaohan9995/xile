const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    code: '',
    submitting: false,
  },

  onLoad() {
    if (!auth.requireLogin('/packageTeacher/link-teacher/link-teacher')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
  },

  onCodeInput(e) {
    const code = (e.detail.value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    this.setData({ code });
  },

  async submit() {
    const code = (this.data.code || '').replace(/-/g, '').trim();
    if (code.length !== 8) {
      wx.showToast({ title: '请输入 8 位关联码', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const data = await request({
        url: '/api/mp/auth/link-teacher',
        method: 'POST',
        data: { code },
        silent: true,
      });
      auth.applySession(data);
      wx.showToast({ title: '教师身份已关联', icon: 'success' });
      setTimeout(() => wx.reLaunch({ url: '/packageTeacher/home/home' }), 700);
    } catch (error) {
      wx.showToast({ title: error.message || '关联失败，请重试', icon: 'none', duration: 2500 });
    } finally {
      this.setData({ submitting: false });
    }
  },

  usePasswordLogin() {
    wx.navigateTo({ url: '/packageTeacher/account-login/account-login?returnUrl=%2FpackageTeacher%2Fhome%2Fhome' });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/packageTeacher/profile/profile' });
  },
});
