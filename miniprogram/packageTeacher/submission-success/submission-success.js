Page({
  data: {},

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index',
    });
  },

  goMine() {
    wx.redirectTo({
      url: '/packageTeacher/home/home',
    });
  },
});
