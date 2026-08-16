const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();
let _searchTimer = null;

const TIER_OPTIONS = ['全部', 'L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

Page({
  data: {
    statusBarHeight: 20,
    keyword: '',
    searchMode: 'name',
    searchModes: [
      { id: 'region', label: '按地区' },
      { id: 'name', label: '按姓名/喜乐名' },
      { id: 'certificate', label: '按证书编号' },
    ],
    searched: false,
    // Filter state
    tierOptions: TIER_OPTIONS,
    tierIndex: 0,
    cityOptions: ['全部'],
    cityIndex: 0,
    showFilterPanel: false,
    // Results
    teachers: [],
    loading: false,
    loadingMore: false,
    error: '',
    page: 1,
    hasMore: true,
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadCityOptions();
    this.doSearch();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, teachers: [] });
    this.doSearch().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore();
    }
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
    this.debounceSearch();
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.searchMode) return;
    this.setData({ searchMode: mode, keyword: '', page: 1, hasMore: true, teachers: [], searched: false, error: '' });
    if (mode === 'region' && this.data.cityIndex > 0) this.doSearch();
  },

  debounceSearch() {
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      this.setData({ page: 1, hasMore: true, teachers: [] });
      this.doSearch();
    }, 400);
  },

  toggleFilter() {
    this.setData({ showFilterPanel: !this.data.showFilterPanel });
  },

  onTierChange(e) {
    this.setData({ tierIndex: e.detail.value, page: 1, hasMore: true, teachers: [] });
    this.doSearch();
  },

  onCityChange(e) {
    this.setData({ cityIndex: e.detail.value, page: 1, hasMore: true, teachers: [] });
    if (this.data.searchMode === 'region' || this.data.keyword) this.doSearch();
  },

  resetFilters() {
    this.setData({ tierIndex: 0, cityIndex: 0, page: 1, hasMore: true, teachers: [] });
    this.doSearch();
  },

  async loadCityOptions() {
    try {
      const payload = await request({ url: '/api/mp/teachers/search?q=&page=1&pageSize=1' });
      if (payload.cities && payload.cities.length) {
        this.setData({ cityOptions: ['全部'].concat(payload.cities) });
      }
    } catch (e) {
      // keep default
    }
  },

  _buildUrl(page) {
    const { keyword, searchMode, tierIndex, tierOptions, cityIndex, cityOptions } = this.data;
    let url = `/api/mp/teachers/search?mode=${searchMode}&q=${encodeURIComponent(keyword)}&page=${page}&pageSize=20`;
    if (tierIndex > 0) {
      url += `&tier=${encodeURIComponent(tierOptions[tierIndex])}`;
    }
    if (cityIndex > 0) {
      url += `&city=${encodeURIComponent(cityOptions[cityIndex])}`;
    }
    return url;
  },

  async doSearch() {
    if (this.data.searchMode === 'region' && this.data.cityIndex === 0) {
      this.setData({ searched: false, teachers: [], error: '' });
      wx.showToast({ title: '请选择地区后查询', icon: 'none' });
      return;
    }
    if (this.data.searchMode !== 'region' && !this.data.keyword.trim()) {
      this.setData({ searched: false, teachers: [], error: '' });
      return;
    }
    this.setData({ loading: true, error: '' });
    try {
      const payload = await request({ url: this._buildUrl(1) });
      this.setData({
        teachers: payload.items || [],
        searched: true,
        hasMore: payload.hasMore || false,
        page: 1,
      });
      if (payload.cities && payload.cities.length && this.data.cityOptions.length <= 1) {
        this.setData({ cityOptions: ['全部'].concat(payload.cities) });
      }
    } catch (err) {
      this.setData({ error: '查询失败，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMore() {
    this.setData({ loadingMore: true });
    try {
      const nextPage = this.data.page + 1;
      const payload = await request({ url: this._buildUrl(nextPage) });
      const newItems = payload.items || [];
      this.setData({
        teachers: this.data.teachers.concat(newItems),
        page: nextPage,
        hasMore: payload.hasMore || false,
      });
    } catch (err) {
      wx.showToast({ title: '加载更多失败', icon: 'none' });
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  openTeacher(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/teacher-detail/teacher-detail?id=${id}`,
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
