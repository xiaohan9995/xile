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
    if (!auth.requireAuth('/packageTeacher/home/home')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadCertification();
  },

  onShow() {
    if (auth.isLoggedIn()) {
      this.loadCertification();
    }
  },

  onPullDownRefresh() {
    this.loadCertification().then(() => wx.stopPullDownRefresh());
  },

  async loadCertification() {
    try {
      const payload = await request({ url: '/api/mp/teachers/me/certification' });
      const t = payload.teacher || {};
      this.setData({
        teacher: {
          name: t.name || '老师',
          tier: t.tier || 'L1',
          tierName: t.tierName || '认证导师',
          avatarUrl: t.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=180&q=80',
          validUntil: t.validUntil || '--',
          daysLeft: t.daysLeft != null ? t.daysLeft : 0,
        },
      });
    } catch (err) {
      wx.showToast({ title: '加载认证信息失败', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  goProfile() {
    wx.navigateTo({ url: '/packageTeacher/profile/profile' });
  },

  goReviewRecords() {
    wx.navigateTo({ url: '/packageTeacher/review-records/review-records' });
  },

  goCertView() {
    wx.navigateTo({ url: '/packageTeacher/cert-view/cert-view' });
  },

  goReviewApply() {
    wx.navigateTo({ url: '/packageTeacher/review-apply/review-apply' });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新验证手机号',
      confirmText: '退出',
      confirmColor: '#c84a4a',
      success: (res) => {
        if (res.confirm) {
          auth.logout();
          wx.reLaunch({ url: '/pages/index/index' });
        }
      },
    });
  },
});
