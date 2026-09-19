const { request } = require('../../utils/request');
const auth = require('../../utils/auth');
const { normalizeMultiline } = require('../../utils/text');

const app = getApp();

// Dates arrive as "YYYY.MM.DD"; only the year is shown for certification years.
const yearOf = (value) => (value ? String(value).slice(0, 4) : '');

// 等级名称里括号内常是补充说明（如「喜乐智慧生命教练（喜乐瑜伽高级教师）」），
// 标题区只展示主名称，去掉全角/半角括号及其内容。
const stripParenthetical = (value) =>
  value ? String(value).replace(/[（(][^（）()]*[）)]/g, '').trim() : '';

// 后端下发的头像/证书可能是 API 相对路径（"/uploads/..."），<image> 无法解析，
// 需要补上 API 域名；微信头像（qlogo.cn）走后端代理，避免小程序域名白名单问题。
const displayFileUrl = (url) => {
  if (!url) return '';
  const baseUrl = (app && app.globalData && app.globalData.apiBaseUrl) || '';
  if (/^https:\/\/(?:thirdwx|wx)\.qlogo\.cn\//i.test(url)) {
    return baseUrl ? `${baseUrl}/api/mp/auth/avatar-proxy?url=${encodeURIComponent(url)}` : url;
  }
  if (/^https?:\/\//i.test(url)) return url;
  return baseUrl ? `${baseUrl}${url}` : url;
};

Page({
  data: {
    statusBarHeight: 20,
    teacher: null,
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

  onPullDownRefresh() {
    const id = this.data.teacher && this.data.teacher.id;
    if (!id) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadTeacher(id).then(() => wx.stopPullDownRefresh());
  },

  async loadTeacher(id) {
    this.setData({ loading: true, error: '' });
    try {
      const teacher = await request({ url: `/api/mp/teachers/${id}/summary` });
      teacher.avatarUrl = displayFileUrl(teacher.avatarUrl);
      teacher.certificateUrl = displayFileUrl(teacher.certificateUrl);
      // 个人简介是多行文本，统一换行格式：连续空行压缩为段落分隔，行首尾空白去掉。
      teacher.teachingSummary = normalizeMultiline(teacher.teachingSummary);
      teacher.tierNameShort = stripParenthetical(teacher.tierName);
      this.setData({
        teacher,
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
    if (!this.data.teacher || !this.data.teacher.teachingSummary) return;
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
