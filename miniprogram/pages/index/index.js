const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    stats: {
      totalTeachers: '--',
      totalStudios: '--',
    },
    announcements: [],
    featuredTeachers: [],
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadStats();
    this.loadHomepage();
  },

  async loadStats() {
    try {
      const payload = await request({ url: '/api/mp/stats/overview', silent: true });
      if (payload) {
        this.setData({
          stats: {
            totalTeachers: this.formatNumber(payload.totalTeachers || 0),
            totalStudios: this.formatNumber(payload.totalStudios || 0),
          },
        });
      }
    } catch (e) {}
  },

  async loadHomepage() {
    try {
      const payload = await request({ url: '/api/mp/homepage', silent: true });
      if (payload) {
        this.setData({
          announcements: payload.announcements || [],
          featuredTeachers: payload.featuredTeachers || [],
        });
      }
    } catch (e) {}
  },

  formatNumber(num) {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/teacher-search/teacher-search' });
  },

  goMyCert() {
    if (!auth.isLoggedIn() || !auth.isPhoneBound()) {
      wx.navigateTo({ url: '/packageTeacher/account-login/account-login?returnUrl=' + encodeURIComponent('/packageTeacher/home/home') });
      return;
    }
    wx.navigateTo({ url: '/packageTeacher/home/home' });
  },

  goStudios() {
    wx.navigateTo({ url: '/pages/studios/studios' });
  },

  openTeacher(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/teacher-detail/teacher-detail?id=${id}` });
  },
});
