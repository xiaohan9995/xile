const auth = require('../../utils/auth');

Component({
  properties: {
    active: {
      type: String,
      value: '',
    },
  },
  methods: {
    goHome() {
      if (this.data.active === 'home') return;
      wx.reLaunch({ url: '/pages/index/index' });
    },
    goStudio() {
      if (this.data.active === 'studio') return;
      wx.reLaunch({ url: '/pages/studios/studios' });
    },
    goMy() {
      if (this.data.active === 'my') return;
      if (!auth.isLoggedIn()) {
        wx.navigateTo({ url: auth.loginUrl('/packageTeacher/profile/profile') });
        return;
      }
      wx.reLaunch({ url: '/packageTeacher/profile/profile' });
    },
  },
});
