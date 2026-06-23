const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    stats: {
      totalTeachers: '--',
      completedReviews: '--',
    },
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadStats();
  },

  async loadStats() {
    try {
      const payload = await request({ url: '/api/mp/stats/overview' });
      if (payload) {
        this.setData({
          stats: {
            totalTeachers: this.formatNumber(payload.totalTeachers || 0),
            completedReviews: this.formatNumber(payload.completedReviews || 0),
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
    if (!auth.isLoggedIn() || !auth.isPhoneBound()) {
      wx.navigateTo({ url: '/packageTeacher/login/login?returnUrl=' + encodeURIComponent('/packageTeacher/home/home') });
      return;
    }
    wx.navigateTo({ url: '/packageTeacher/home/home' });
  },

  goStudios() {
    wx.navigateTo({ url: '/pages/studios/studios' });
  },

  goYouzan() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent('https://shop.youzan.com'),
      fail() {
        wx.setClipboardData({
          data: 'https://shop.youzan.com',
          success() {
            wx.showToast({ title: '链接已复制', icon: 'success' });
          },
        });
      },
    });
  },
});
