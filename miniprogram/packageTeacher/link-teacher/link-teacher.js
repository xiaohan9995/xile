const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    idNumber: '',
    password: '',
    submitting: false,
  },

  onLoad() {
    if (!auth.requireLogin('/packageTeacher/link-teacher/link-teacher')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
  },

  onIdNumberInput(e) {
    this.setData({ idNumber: (e.detail.value || '').toUpperCase().replace(/\s/g, '') });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value || '' });
  },

  async submit() {
    const idNumber = (this.data.idNumber || '').trim();
    if (idNumber.length < 6 || !this.data.password) {
      wx.showToast({ title: '请输入身份证号和密码', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const data = await request({
        url: '/api/mp/auth/link-teacher-by-password',
        method: 'POST',
        data: { idNumber, password: this.data.password },
        silent: true,
      });
      auth.applySession(data);
      wx.showToast({ title: '关联成功，请先重置密码', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/packageTeacher/settings/settings?forcePasswordChange=1' }), 700);
    } catch (error) {
      wx.showToast({ title: error.message || '关联失败，请重试', icon: 'none', duration: 2500 });
    } finally {
      this.setData({ submitting: false });
    }
  },

  usePasswordLogin() {
    wx.navigateTo({ url: '/packageTeacher/account-login/account-login?returnUrl=%2FpackageTeacher%2Fprofile%2Fprofile' });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/packageTeacher/profile/profile' });
  },
});
