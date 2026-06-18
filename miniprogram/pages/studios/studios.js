const { request } = require('../../utils/request');

Page({
  data: {
    studios: [],
    allStudios: [],
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
    error: '',
  },

  onLoad() {
    this.loadStudios();
  },

  async loadStudios() {
    this.setData({ loading: true, error: '' });
    try {
      const payload = await request({ url: '/api/mp/studios' });
      const items = (payload.items || []).map((studio) => ({
        ...studio,
        coverImage: studio.imageUrl || studio.coverUrl || 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop',
        tags: studio.tags && studio.tags.length ? studio.tags : ['静心冥想', '小班授课'],
      }));
      this.setData({ allStudios: items });
      this.applyFilters();
    } catch (error) {
      this.setData({ error: '工作室信息暂时无法加载，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  changeCity(event) {
    this.setData({ activeCity: event.currentTarget.dataset.city });
    this.applyFilters();
  },

  applyFilters() {
    const { allStudios, activeCity, keyword } = this.data;
    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
    const studios = allStudios.filter((studio) => {
      const cityText = `${studio.city || ''}${studio.district || ''}`;
      const haystack = `${studio.name || ''}${studio.city || ''}${studio.district || ''}${studio.address || ''}${(studio.tags || []).join('')}`.toLowerCase();
      const cityMatched = activeCity === 'all' || cityText.indexOf(activeCity) >= 0;
      const keywordMatched = !normalizedKeyword || haystack.indexOf(normalizedKeyword) >= 0;
      return cityMatched && keywordMatched;
    });
    this.setData({ studios });
  },

  resetFilters() {
    this.setData({ activeCity: 'all', keyword: '' });
    this.applyFilters();
  },

  openStudio(event) {
    wx.navigateTo({
      url: `/pages/studio-detail/studio-detail?id=${event.currentTarget.dataset.id}`,
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goSearch() {
    wx.navigateTo({
      url: '/pages/teacher-search/teacher-search',
    });
  },

  goMine() {
    wx.navigateTo({
      url: '/packageTeacher/home/home',
    });
  },
});
