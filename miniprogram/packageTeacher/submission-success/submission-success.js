const auth = require('../../utils/auth');

Page({
  data: {},

  onLoad() {
    if (!auth.requireLogin('/packageTeacher/submission-success/submission-success')) return;
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goMyCert() {
    wx.redirectTo({ url: '/packageTeacher/profile/profile' });
  },
});
