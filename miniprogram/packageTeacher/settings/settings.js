const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    nickname: '',
    savingNickname: false,
    currentPassword: '',
    newPassword: '',
    changingPassword: false,
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
        nickname: data.nickname || auth.getNickname() || '',
      });
    } catch (err) {
      this.setData({
        nickname: auth.getNickname() || '',
      });
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value || '' });
  },

  onPasswordInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value || '' });
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
      wx.showToast({ title: '密码已更新', icon: 'success' });
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
    const nickname = (this.data.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }
    this.setData({ savingNickname: true });
    try {
      const res = await request({
        url: '/api/mp/auth/update-profile',
        method: 'POST',
        silent: true,
        data: { nickname },
      });
      auth.setNickname(res.nickname || nickname);
      this.setData({ nickname: res.nickname || nickname });
      wx.showToast({ title: '昵称已保存', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '昵称保存失败', icon: 'none' });
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
