const { request } = require('../../utils/request');

Page({
  data: {
    stats: {
      totalTeachers: '--',
      totalStudios: '--',
    },
  },

  onLoad() {
    this.loadStats();
  },

  async loadStats() {
    try {
      const payload = await request({ url: '/api/mp/stats/overview' });
      if (payload) {
        this.setData({
          stats: {
            totalTeachers: this.formatNumber(payload.totalTeachers || 0),
            totalStudios: this.formatNumber(payload.totalStudios || 0),
          },
        });
      }
    } catch (e) {
      // Keep placeholder on failure
    }
  },

  formatNumber(num) {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/teacher-search/teacher-search' });
  },

  goMyCert() {
    wx.navigateTo({ url: '/packageTeacher/home/home' });
  },

  goStudios() {
    wx.navigateTo({ url: '/pages/studios/studios' });
  },
});
