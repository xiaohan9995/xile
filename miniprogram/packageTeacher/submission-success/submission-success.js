Page({
  data: {},

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goMyCert() {
    wx.redirectTo({ url: '/packageTeacher/profile/profile' });
  },
});
