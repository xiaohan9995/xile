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
    featuredPage: 0,
    featuredHasMore: true,
    featuredLoading: false,
    homepageLoading: true,
    homepageLoadError: false,
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadStats();
    this.loadHomepage();
    this.loadFeaturedTeachers({ reset: true });
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

  async loadFeaturedTeachers({ reset = false } = {}) {
    if (this.data.featuredLoading || (!reset && !this.data.featuredHasMore)) return;
    const page = reset ? 1 : this.data.featuredPage + 1;
    this.setData({ featuredLoading: true });
    try {
      const payload = await request({
        url: `/api/mp/teachers/featured?page=${page}&pageSize=4`,
        silent: true,
      });
      const items = payload && Array.isArray(payload.items) ? payload.items : [];
      this.setData({
        featuredTeachers: reset ? items : this.data.featuredTeachers.concat(items),
        featuredPage: page,
        featuredHasMore: !!(payload && payload.hasMore),
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
      this.loadFeaturedTeachers({ reset: true }),
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
      wx.navigateTo({ url: auth.loginUrl('/packageTeacher/home/home') });
      return;
    }
    if (!auth.isTeacher()) {
      wx.navigateTo({ url: '/packageTeacher/profile/profile' });
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

  loadMoreFeaturedTeachers() {
    this.loadFeaturedTeachers();
  },
});
