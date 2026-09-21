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
    featuredLoading: false,
    homepageLoading: true,
    homepageLoadError: false,
    homeBanner: '',
  },

  onLoad() {
    if (!auth.requireLogin('/pages/index/index')) return;
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      // 先用上次缓存的稳定 URL 同步渲染，避免进入页面先闪一下兜底图。
      homeBanner: wx.getStorageSync('home_banner_url') || '',
    });
    this.loadStats();
    this.loadHomepage();
    this.loadFeaturedTeachers();
    this.loadBanners();
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
    } catch (e) {
      console.warn('load overview stats failed', e.code || e.message);
    }
  },

  async loadHomepage() {
    this.setData({ homepageLoading: true, homepageLoadError: false });
    try {
      const payload = await request({ url: '/api/mp/homepage', silent: true });
      if (payload) {
        this.setData({
          announcements: payload.announcements || [],
        });
      }
    } catch (e) {
      console.warn('load homepage failed', e.code || e.message);
      this.setData({ homepageLoadError: true });
    } finally {
      this.setData({ homepageLoading: false });
    }
  },

  async loadBanners() {
    try {
      const payload = await request({ url: '/api/mp/banners', silent: true });
      if (!payload) return;
      const home = payload.home || '';
      this.setData({ homeBanner: home });
      if (home) wx.setStorageSync('home_banner_url', home);
      else wx.removeStorageSync('home_banner_url');
    } catch (e) {
      console.warn('load banners failed', e.code || e.message);
    }
  },

  async loadFeaturedTeachers() {
    if (this.data.featuredLoading) return;
    this.setData({ featuredLoading: true });
    try {
      const payload = await request({
        url: '/api/mp/teachers/featured?page=1&pageSize=10',
        silent: true,
      });
      const items = payload && Array.isArray(payload.items) ? payload.items : [];
      this.setData({
        featuredTeachers: items,
      });
    } catch (e) {
      console.warn('load featured teachers failed', e.code || e.message);
    } finally {
      this.setData({ featuredLoading: false });
    }
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadStats(),
      this.loadHomepage(),
      this.loadFeaturedTeachers(),
      this.loadBanners(),
    ]).finally(() => wx.stopPullDownRefresh());
  },

  retryHomepage() {
    this.loadHomepage();
  },

  formatNumber(num) {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/teacher-search/teacher-search' });
  },

  goMyCert() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: auth.loginUrl('/packageTeacher/profile/profile') });
      return;
    }
    if (!auth.isTeacher()) {
      wx.navigateTo({ url: '/packageTeacher/profile/profile' });
      return;
    }
    wx.navigateTo({ url: '/packageTeacher/profile/profile' });
  },

  goStudios() {
    wx.navigateTo({ url: '/pages/studios/studios' });
  },

  openTeacher(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/teacher-detail/teacher-detail?id=${id}` });
  },
});
