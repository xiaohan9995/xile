const auth = require('./utils/auth');

App({
  onLaunch() {
    this.detectEnv();

    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : {};
    this.globalData.statusBarHeight = windowInfo.statusBarHeight || 20;

    const teacherId = wx.getStorageSync('currentTeacherId');
    if (teacherId) {
      this.globalData.teacherId = teacherId;
    }

    this.globalData.phoneBound = auth.isPhoneBound();
    this.globalData.avatarUrl = auth.getAvatarUrl();
    this.globalData.nickname = auth.getNickname();

    // Login is initiated by the teacher after entering a protected area.
    // Do not call wx.login silently at startup: public pages must work without it.
    this.globalData.loginReady = true;
    this.globalData.loginPromise = Promise.resolve();
  },

  detectEnv() {
    // CloudBase is used by release, trial and development versions. This keeps
    // real-device development from accidentally requesting 127.0.0.1.
    const envId = 'xile-yoga-d4g2za8xi82a16810';
    if (!wx.cloud) {
      console.error('当前微信版本不支持云开发能力');
      this.globalData.cloudInitError = '当前微信版本不支持云开发能力';
      return;
    }
    wx.cloud.init({ env: envId, traceUser: true });
    this.globalData.cloudEnv = envId;
    // File downloads (for example certificate previews) cannot use
    // wx.cloud.callContainer, so they need the public CloudRun origin.
    this.globalData.apiBaseUrl = 'https://xile-yoga-297941-11-1305573525.sh.run.tcloudbase.com';
  },

  globalData: {
    apiBaseUrl: 'http://127.0.0.1:5001',
    // Keep false during integration so endpoint failures remain visible.
    useMockFallback: false,
    cloudEnv: '',
    teacherId: null,
    userId: null,
    phoneBound: false,
    avatarUrl: '',
    nickname: '',
    statusBarHeight: 20,
    loginReady: false,
    loginPromise: null,
    cloudInitError: '',
  },
});
