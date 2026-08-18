const auth = require('../../utils/auth');

Page({
  data: {
    loading: false,
    loginReady: false,
    returnUrl: '',
  },

  onLoad(options) {
    const returnUrl = decodeURIComponent(options.returnUrl || '/packageTeacher/home/home');
    this.setData({ returnUrl, loginReady: true });

    if (auth.isLoggedIn()) {
      wx.reLaunch({ url: auth.isTeacher() ? returnUrl : '/packageTeacher/profile/profile' });
    }
  },

  async onWechatLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const data = await auth.loginWithWechat();
      wx.reLaunch({ url: data.teacherId ? this.data.returnUrl : '/packageTeacher/profile/profile' });
    } catch (err) {
      wx.showToast({ title: err.message || '微信登录失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
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
