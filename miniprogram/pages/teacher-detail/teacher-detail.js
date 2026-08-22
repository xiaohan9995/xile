const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

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
    if (!auth.requireLogin(`/pages/teacher-detail/teacher-detail?id=${options.id || ''}`)) return;
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

  previewCertificate() {
    const url = this.data.teacher && this.data.teacher.certificateUrl;
    if (!url) {
      wx.showToast({ title: '证书图片暂未生成', icon: 'none' });
      return;
    }
    wx.previewImage({ urls: [url], current: url });
  },
});
