const auth = require('../../utils/auth');

Page({
  data: {},

  onLoad() {
    if (!auth.requireLogin('/packageTeacher/submission-success/submission-success')) return;
  },

  onShow() {
    // Guard re-entry so a guest cannot keep the submission receipt on screen.
    if (!auth.isLoggedIn()) {
      auth.requireLogin('/packageTeacher/submission-success/submission-success');
    }
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goMyCert() {
    wx.redirectTo({ url: '/packageTeacher/profile/profile' });
  },
});
