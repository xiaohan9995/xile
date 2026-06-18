const { request } = require('../../utils/request');

const app = getApp();
let _searchTimer = null;

Page({
  data: {
    statusBarHeight: 20,
    keyword: '',
    activeTier: 'all',
    tiers: [
      { label: '全部', value: 'all' },
      { label: 'L1', value: 'L1' },
      { label: 'L2', value: 'L2' },
      { label: 'L3', value: 'L3' },
      { label: 'L4', value: 'L4' },
      { label: 'L5', value: 'L5' },
    ],
    teachers: [],
    loading: false,
    error: '',
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.doSearch();
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
    this.debounceSearch();
  },

  clearKeyword() {
    this.setData({ keyword: '' });
    this.doSearch();
  },

  debounceSearch() {
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      this.doSearch();
    }, 400);
  },

  onTierTap(e) {
    const tier = e.currentTarget.dataset.tier;
    this.setData({ activeTier: tier });
    this.doSearch();
  },

  async doSearch() {
    this.setData({ loading: true, error: '' });
    try {
      const { keyword, activeTier } = this.data;
      let url = `/api/mp/teachers/search?q=${encodeURIComponent(keyword)}`;
      if (activeTier !== 'all') {
        url += `&tier=${activeTier}`;
      }
      const payload = await request({ url });
      this.setData({ teachers: payload.items || [] });
    } catch (err) {
      this.setData({ error: '查询失败，请稍后重试' });
    } finally {
      this.setData({ loading: false });
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
