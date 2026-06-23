const auth = require('./utils/auth');

App({
  onLaunch() {
    this.detectEnv();

    const sysInfo = wx.getSystemInfoSync();
    this.globalData.statusBarHeight = sysInfo.statusBarHeight || 20;

    const teacherId = wx.getStorageSync('currentTeacherId');
    if (teacherId) {
      this.globalData.teacherId = teacherId;
    }

    this.globalData.phoneBound = auth.isPhoneBound();
    this.globalData.avatarUrl = auth.getAvatarUrl();
    this.globalData.nickname = auth.getNickname();

    if (!auth.isLoggedIn()) {
      this.globalData.loginPromise = auth.loginWithWechat()
        .then((data) => {
          this.globalData.phoneBound = !!data.phoneBound;
          this.globalData.loginReady = true;
        })
        .catch((err) => {
          console.warn('silent login failed:', err);
          this.globalData.loginReady = true;
        });
    } else {
      this.globalData.loginReady = true;
      this.globalData.loginPromise = Promise.resolve();
    }
  },

  detectEnv() {
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion;

    if (envVersion === 'release' || envVersion === 'trial') {
      const envId = 'prod-4gywi0mq15a2a767';
      wx.cloud.init({ env: envId });
      this.globalData.cloudEnv = envId;
      this.globalData.apiBaseUrl = '';
    }
    // 'develop' version or devtools: use local dev server
  },

  globalData: {
    apiBaseUrl: 'http://127.0.0.1:5000',
    cloudEnv: '',
    teacherId: null,
    userId: null,
    phoneBound: false,
    avatarUrl: '',
    nickname: '',
    statusBarHeight: 20,
    loginReady: false,
    loginPromise: null,
  },
});
