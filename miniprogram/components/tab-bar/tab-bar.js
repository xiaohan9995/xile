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
      wx.navigateTo({ url: '/pages/index/index' });
    },
    goSearch() {
      if (this.data.active === 'search') return;
      wx.navigateTo({ url: '/pages/teacher-search/teacher-search' });
    },
    goStudio() {
      if (this.data.active === 'studio') return;
      wx.navigateTo({ url: '/pages/studios/studios' });
    },
  },
});
