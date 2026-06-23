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
    cityOptions: [
      { label: '全部', value: 'all' },
      { label: '上海', value: '上海' },
      { label: '北京', value: '北京' },
      { label: '杭州', value: '杭州' },
      { label: '广州', value: '广州' },
      { label: '深圳', value: '深圳' },
    ],
    loading: false,
    loadingMore: false,
    page: 1,
    hasMore: true,
  },

  onLoad() {
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
      coverImage: studio.imageUrl || studio.coverUrl || 'https://images.unsplash.com/photo-1593810450967-f9c42742e326?auto=format&fit=crop&w=400&q=80',
      tags: studio.tags && studio.tags.length ? studio.tags : ['静心冥想', '小班授课'],
    }));
  },

  async loadStudios() {
    this.setData({ loading: true });
    try {
      const payload = await request({ url: this._buildUrl(1) });
      this.setData({
        studios: this._mapItems(payload.items),
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
    wx.navigateBack();
  },
});
