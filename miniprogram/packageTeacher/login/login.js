const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: {
    loading: false,
    loginReady: false,
    returnUrl: '',
    step: 0,
  },

  onLoad(options) {
    this.setData({
      returnUrl: decodeURIComponent(options.returnUrl || '/packageTeacher/home/home'),
    });
    this.setData({ loginReady: true });
    if (auth.isLoggedIn() && auth.isPhoneBound() && auth.isTeacher()) {
      wx.reLaunch({ url: this.data.returnUrl });
    } else if (auth.isLoggedIn() && !auth.isPhoneBound()) {
      this.setData({ step: 2 });
    } else if (auth.isLoggedIn()) {
      this.setData({ step: 3 });
    }
  },

  async onWechatLogin() {
    this.setData({ loading: true });
    try {
      const data = await auth.loginWithWechat();
      if (data.phoneBound && data.teacherId) {
        wx.reLaunch({ url: this.data.returnUrl });
        return;
      }
      this.setData({ step: data.phoneBound ? 3 : 2 });
    } catch (err) {
      wx.showToast({ title: '微信登录失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '已取消验证', icon: 'none' });
      return;
    }
    const code = e.detail.code;
    this.setData({ loading: true });

    request({
      url: '/api/mp/auth/bind-phone',
      method: 'POST',
      data: { code },
    })
      .then((data) => {
        auth.setPhoneBound(true);
        auth.setTeacherIdentity(data.teacherId, data.role);
        if (!data.matchedTeacher) {
          this.setData({ step: 3 });
          wx.showToast({ title: '未匹配到教师档案', icon: 'none' });
          return;
        }
        wx.showToast({ title: '验证成功', icon: 'success' });
        setTimeout(() => {
          wx.reLaunch({ url: this.data.returnUrl });
        }, 500);
      })
      .catch(() => {
        wx.showToast({ title: '验证失败，请重试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  onSkip() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/index/index' }) });
  },

  goPasswordLogin() {
    wx.navigateTo({
      url: `/packageTeacher/account-login/account-login?returnUrl=${encodeURIComponent(this.data.returnUrl)}`,
    });
  },
});
