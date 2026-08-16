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
    review: { statusText: '待查看', hint: '进入年审中心查看本期安排', actionText: '查看年审进度' },
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
      const latestReview = (payload.reviews || [])[0] || {};
      const reviewStates = {
        submitted: ['已提交', '材料已收到，等待审核分配'],
        in_review: ['审核中', '审核小组正在核验材料'],
        pending_publication: ['结果待发布', '审核已完成，等待管理员正式发布'],
        pending_publication_rejected: ['结果待发布', '审核已完成，等待管理员正式发布'],
        published_approved: ['本期已通过', `有效期至 ${t.validUntil || '--'}`],
        published_rejected: ['本期未通过', '请查看审核意见并补充材料'],
        approved: ['本期已通过', `有效期至 ${t.validUntil || '--'}`],
        rejected: ['本期未通过', '请查看审核意见并补充材料'],
      };
      const state = reviewStates[latestReview.status] || ['待提交', '请在截止日前完成本期年审申请'];
      this.setData({
        teacher: {
          name: t.name || '老师',
          tier: t.tier || 'L1',
          tierName: t.tierName || '认证导师',
          avatarUrl: t.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=180&q=80',
          validUntil: t.validUntil || '--',
          daysLeft: t.daysLeft != null ? t.daysLeft : 0,
        },
        review: { statusText: state[0], hint: state[1], actionText: latestReview.status ? '查看年审进度' : '提交年审申请' },
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

  goReviewCenter() {
    if (this.data.review.actionText === '提交年审申请') return this.goReviewApply();
    this.goReviewRecords();
  },

  goTeachingRecords() {
    wx.navigateTo({ url: '/packageTeacher/teaching-records/teaching-records' });
  },

  goCertView() {
    wx.navigateTo({ url: '/packageTeacher/cert-view/cert-view' });
  },

  goUsageGuide() {
    wx.navigateTo({ url: '/packageTeacher/usage-guide/usage-guide' });
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
