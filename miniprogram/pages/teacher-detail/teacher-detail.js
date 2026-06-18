const { request } = require('../../utils/request');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    teacher: null,
    specialtiesText: '',
    loading: false,
    error: '',
  },

  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    if (options.id) {
      this.loadTeacher(options.id);
    }
  },

  async loadTeacher(id) {
    this.setData({ loading: true, error: '' });
    try {
      const teacher = await request({ url: `/api/mp/teachers/${id}/summary` });
      this.setData({
        teacher,
        specialtiesText: (teacher.specialties || []).join('、') || '未填写',
      });
    } catch (err) {
      this.setData({ error: '教师详情暂时无法加载，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
