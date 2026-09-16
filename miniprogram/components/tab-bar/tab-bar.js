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
    goTeacher() {
      if (this.data.active === 'teacher') return;
      wx.reLaunch({ url: '/pages/teacher-search/teacher-search' });
    },
    goMy() {
      if (this.data.active === 'my') return;
      // Guests land on the profile shell too: it renders the same 讲师服务
      // entries, and each second-level entry is intercepted inside the page.
      wx.reLaunch({ url: '/packageTeacher/profile/profile' });
    },
  },
});
