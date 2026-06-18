const { request } = require('../../utils/request');

Page({
  data: {
    teacher: null,
    specialtiesText: '',
    loading: false,
    error: '',
  },

  onLoad(options) {
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
        specialtiesText: (teacher.specialties || []).join('、'),
      });
    } catch (error) {
      this.setData({ error: '教师详情暂时无法加载' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  openCertificate() {
    wx.navigateTo({ url: '/packageTeacher/profile/profile' });
  },
});
