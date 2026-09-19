const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();
let _searchTimer = null;

Page({
  data: {
    statusBarHeight: 20,
    studios: [],
    keyword: '',
    activeCity: 'all',
    cityOptions: [{ label: '全部', value: 'all' }],
    loading: false,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },

  onLoad() {
    if (!auth.requireLogin('/pages/studios/studios')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadStudios();
  },

  onPullDownRefresh() {
    if (_searchTimer) { clearTimeout(_searchTimer); _searchTimer = null; }
    this.setData({ page: 1, hasMore: true, studios: [] });
    this.loadStudios().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore();
    }
  },

  _buildUrl(page) {
    const { activeCity, keyword } = this.data;
    let url = `/api/mp/studios?page=${page}&pageSize=20`;
    if (activeCity !== 'all') {
      url += `&city=${encodeURIComponent(activeCity)}`;
    }
    if (keyword.trim()) {
      url += `&q=${encodeURIComponent(keyword.trim())}`;
    }
    return url;
  },

  _mapItems(items) {
    return (items || []).map((studio) => ({
      ...studio,
      // 无封面图时交给 studio-card 组件用本地默认图兜底，不再硬编码外部占位图。
      coverImage: (Array.isArray(studio.images) && studio.images[0]) || studio.coverUrl || '',
      tags: Array.isArray(studio.tags) ? studio.tags : [],
    }));
  },

  async loadStudios() {
    this.setData({ loading: true });
    try {
      const payload = await request({ url: this._buildUrl(1) });
      // 城市筛选项随数据动态更新，保证工作室设置任意城市后都能被筛选到。
      const cities = (payload.cities || []).filter(Boolean);
      const cityOptions = [
        { label: '全部', value: 'all' },
        ...cities.map((city) => ({ label: city, value: city })),
      ];
      // 若当前选中城市已不在可用列表中，回退到「全部」。
      const activeCity = this.data.activeCity !== 'all' && !cities.includes(this.data.activeCity)
        ? 'all'
        : this.data.activeCity;
      this.setData({
        studios: this._mapItems(payload.items),
        cityOptions,
        activeCity,
        page: 1,
        hasMore: payload.hasMore || false,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMore() {
    this.setData({ loadingMore: true });
    try {
      const nextPage = this.data.page + 1;
      const payload = await request({ url: this._buildUrl(nextPage) });
      this.setData({
        studios: this.data.studios.concat(this._mapItems(payload.items)),
        page: nextPage,
        hasMore: payload.hasMore || false,
      });
    } catch (err) {
      wx.showToast({ title: '加载更多失败', icon: 'none' });
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      this.setData({ page: 1, hasMore: true, studios: [] });
      this.loadStudios();
    }, 400);
  },

  changeCity(e) {
    this.setData({ activeCity: e.currentTarget.dataset.city, page: 1, hasMore: true, studios: [] });
    this.loadStudios();
  },

  resetFilters() {
    this.setData({ activeCity: 'all', keyword: '', page: 1, hasMore: true, studios: [] });
    this.loadStudios();
  },

  openStudio(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/studio-detail/studio-detail?id=${id}` });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/pages/index/index' });
  },
});
