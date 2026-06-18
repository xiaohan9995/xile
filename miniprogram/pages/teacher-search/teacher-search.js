const { request } = require('../../utils/request');

Page({
  data: {
    keyword: '',
    teachers: [],
    allTeachers: [],
    activeLevel: 'all',
    activeRegion: 'all',
    activeStatus: 'all',
    levelLabel: '全部级别',
    regionLabel: '全部地区',
    statusLabel: '全部状态',
    levelOptions: [
      { label: '全部级别', value: 'all' },
      { label: 'L2级别', value: 'L2' },
      { label: 'L3级别', value: 'L3' },
    ],
    regionOptions: [{ label: '全部地区', value: 'all' }],
    statusOptions: [
      { label: '全部状态', value: 'all' },
      { label: '认证有效', value: 'approved' },
      { label: '审核中', value: 'pending' },
    ],
    loading: false,
    error: '',
  },

  onLoad() {
    this.searchTeachers();
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  onLevelPick() {
    this.showPicker('level', this.data.levelOptions, 'activeLevel', 'levelLabel');
  },

  onRegionPick() {
    this.showPicker('region', this.data.regionOptions, 'activeRegion', 'regionLabel');
  },

  onStatusPick() {
    this.showPicker('status', this.data.statusOptions, 'activeStatus', 'statusLabel');
  },

  showPicker(field, options, activeKey, labelKey) {
    const labels = options.map((o) => o.label);
    const values = options.map((o) => o.value);
    const currentIdx = Math.max(0, values.indexOf(this.data[activeKey]));
    wx.showActionSheet({
      itemList: labels,
      success: (res) => {
        const idx = res.tapIndex;
        this.setData({ [activeKey]: values[idx], [labelKey]: labels[idx] });
        this.applyFilters();
      },
    });
  },

  async searchTeachers() {
    this.setData({ loading: true, error: '' });
    try {
      const payload = await request({
        url: `/api/mp/teachers/search?q=${encodeURIComponent(this.data.keyword)}`,
      });
      const items = payload.items || [];
      const regionSet = new Set();
      items.forEach((t) => { if (t.city) regionSet.add(t.city); });
      const regionOptions = [
        { label: '全部地区', value: 'all' },
        ...Array.from(regionSet).map((city) => ({ label: city, value: city })),
      ];
      this.setData({ allTeachers: items, regionOptions });
      this.applyFilters();
    } catch (error) {
      this.setData({ error: '教师信息暂时无法加载，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  applyFilters() {
    const { allTeachers, activeLevel, activeRegion, activeStatus, keyword } = this.data;
    let result = allTeachers;
    if (activeLevel !== 'all') {
      result = result.filter((t) => (t.tier || '').indexOf(activeLevel) >= 0);
    }
    if (activeRegion !== 'all') {
      result = result.filter((t) => (t.city || '') === activeRegion);
    }
    if (activeStatus !== 'all') {
      result = result.filter((t) => (t.status || 'approved') === activeStatus);
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (t) =>
          (t.name || '').toLowerCase().indexOf(kw) >= 0 ||
          (t.teacherNo || '').toLowerCase().indexOf(kw) >= 0
      );
    }
    this.setData({ teachers: result });
  },

  openTeacher(event) {
    wx.navigateTo({
      url: `/pages/teacher-detail/teacher-detail?id=${event.currentTarget.dataset.id}`,
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goHome() {
    wx.navigateBack();
  },

  goMine() {
    wx.navigateTo({ url: '/packageTeacher/home/home' });
  },
});
