const { request } = require('../../utils/request');

Page({
  data: {
    allStudios: [],
    filteredStudios: [],
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
  },

  onLoad() {
    this.loadStudios();
  },

  async loadStudios() {
    this.setData({ loading: true });
    try {
      const payload = await request({ url: '/api/mp/studios' });
      const items = (payload.items || []).map((studio) => ({
        ...studio,
        coverImage: studio.imageUrl || studio.coverUrl || 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop',
        tags: studio.tags && studio.tags.length ? studio.tags : ['静心冥想', '小班授课'],
      }));
      this.setData({ allStudios: items });
      this.applyFilters();
    } catch (err) {
      wx.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
    this.applyFilters();
  },

  changeCity(e) {
    this.setData({ activeCity: e.currentTarget.dataset.city });
    this.applyFilters();
  },

  applyFilters() {
    const { allStudios, activeCity, keyword } = this.data;
    const kw = (keyword || '').trim().toLowerCase();
    const filteredStudios = allStudios.filter((s) => {
      const cityMatch = activeCity === 'all' || (s.city || '').indexOf(activeCity) >= 0;
      if (!cityMatch) return false;
      if (!kw) return true;
      const haystack = `${s.name || ''}${s.city || ''}${s.district || ''}${s.address || ''}${(s.tags || []).join('')}`.toLowerCase();
      return haystack.indexOf(kw) >= 0;
    });
    this.setData({ filteredStudios });
  },

  resetFilters() {
    this.setData({ activeCity: 'all', keyword: '' });
    this.applyFilters();
  },

  openStudio(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/studio-detail/studio-detail?id=${id}` });
  },
});
