const { request } = require('../../utils/request');

const app = getApp();
let _searchTimer = null;

Page({
  data: {
    statusBarHeight: 20,
    keyword: '',
    activeFilter: 'all',
    searched: false,
    filters: [
      { label: '全部等级', value: 'all' },
      { label: '全部地区', value: 'region' },
      { label: '认证状态', value: 'status' },
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

  debounceSearch() {
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      this.doSearch();
    }, 400);
  },

  onFilterTap(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ activeFilter: filter });
    this.doSearch();
  },

  async doSearch() {
    this.setData({ loading: true, error: '' });
    try {
      const { keyword, activeFilter } = this.data;
      let url = `/api/mp/teachers/search?q=${encodeURIComponent(keyword)}`;
      if (activeFilter === 'status') {
        url += '&status=valid';
      }
      const payload = await request({ url });
      this.setData({ teachers: payload.items || [], searched: true });
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
