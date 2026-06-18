const auth = require('./utils/auth');

App({
  onLaunch() {
    const teacherId = wx.getStorageSync('currentTeacherId');
    if (teacherId) {
      this.globalData.teacherId = teacherId;
    }
    const sysInfo = wx.getSystemInfoSync();
    this.globalData.statusBarHeight = sysInfo.statusBarHeight || 20;
  },
  globalData: {
    apiBaseUrl: 'http://127.0.0.1:5000',
    teacherId: null,
    userId: null,
    statusBarHeight: 20,
  },
});
