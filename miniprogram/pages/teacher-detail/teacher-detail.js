const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

// Dates arrive as "YYYY.MM.DD"; only the year is shown for certification years.
const yearOf = (value) => (value ? String(value).slice(0, 4) : '');

Page({
  data: {
    statusBarHeight: 20,
    teacher: null,
    teacherInitial: '?',
    commonName: '',
    firstCertifiedYear: '',
    currentTierCertifiedYear: '',
    residencesText: '',
    loading: false,
    error: '',
    bioExpanded: false,
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
      const displayName = teacher.xileName || teacher.realName || teacher.name || '';
      this.setData({
        teacher,
        teacherInitial: displayName ? displayName.charAt(0) : '?',
        commonName: teacher.alias || teacher.realName || '',
        firstCertifiedYear: yearOf(teacher.certifiedAt),
        currentTierCertifiedYear: yearOf(teacher.currentTierCertifiedOn),
        residencesText: (teacher.residences || []).join('、'),
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

  toggleBio() {
    this.setData({ bioExpanded: !this.data.bioExpanded });
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
