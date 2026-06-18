const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    teacher: {
      name: '',
      tier: '',
      tierName: '',
      avatarUrl: '',
      validUntil: '',
      daysLeft: 0,
    },
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadCertification();
  },

  async loadCertification() {
    const teacherId = auth.getTeacherId();
    if (!teacherId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    try {
      const payload = await request({ url: `/api/mp/teachers/${teacherId}/certification` });
      const t = payload.teacher || {};
      this.setData({
        teacher: {
          name: t.name || '老师',
          tier: t.tier || 'L1',
          tierName: t.tierName || '认证讲师',
          avatarUrl: t.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=180&q=80',
          validUntil: t.validUntil || '--',
          daysLeft: t.daysLeft || 0,
        },
      });
    } catch (err) {
      wx.showToast({ title: '加载认证信息失败', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  goReviewRecords() {
    wx.navigateTo({ url: '/packageTeacher/review-records/review-records' });
  },

  goCertView() {
    wx.navigateTo({ url: '/packageTeacher/profile/profile' });
  },
});
