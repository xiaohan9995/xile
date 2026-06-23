const { uploadFile } = require('../../utils/request');
const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    loading: false,
    loginReady: false,
    returnUrl: '',
    step: 1,
    avatarTempPath: '',
    nickname: '',
  },

  onLoad(options) {
    this.setData({
      returnUrl: decodeURIComponent(options.returnUrl || '/packageTeacher/home/home'),
    });
    if (!auth.isLoggedIn()) {
      this.setData({ loading: true });
      auth.loginWithWechat()
        .then((data) => {
          this.setData({ loginReady: true, loading: false });
          if (data.avatarUrl && data.phoneBound) {
            wx.reLaunch({ url: this.data.returnUrl });
          } else if (data.avatarUrl) {
            this.setData({ step: 2 });
          }
        })
        .catch(() => {
          wx.showToast({ title: '登录失败，请重试', icon: 'none' });
          this.setData({ loading: false, loginReady: true });
        });
    } else {
      this.setData({ loginReady: true });
      if (auth.getAvatarUrl() && auth.isPhoneBound()) {
        wx.reLaunch({ url: this.data.returnUrl });
      } else if (auth.getAvatarUrl()) {
        this.setData({ step: 2 });
      }
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) {
      this.setData({ avatarTempPath: avatarUrl });
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value || '' });
  },

  async onNextStep() {
    if (!this.data.avatarTempPath) {
      wx.showToast({ title: '请选择头像', icon: 'none' });
      return;
    }
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await uploadFile({
        url: '/api/mp/auth/update-profile',
        filePath: this.data.avatarTempPath,
        name: 'avatar',
        formData: { nickname: this.data.nickname.trim() },
      });
      auth.setAvatarUrl(res.avatarUrl);
      auth.setNickname(res.nickname);
      this.setData({ step: 2, loading: false });
    } catch (err) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
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
      .then(() => {
        auth.setPhoneBound(true);
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
});
