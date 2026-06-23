const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

const STATUS_MAP = {
  submitted: { text: '审核中', cls: 'status-submitted' },
  approved: { text: '已通过', cls: 'status-approved' },
  rejected: { text: '已驳回', cls: 'status-rejected' },
  draft: { text: '草稿', cls: 'status-submitted' },
  exempt: { text: '无需年审', cls: 'status-approved' },
};

Page({
  data: {
    statusBarHeight: 20,
    activeTab: 'all',
    current: {
      tier: '--',
      tierName: '',
      validUntil: '--',
    },
    records: [],
    allRecords: [],
    loading: false,
  },

  onLoad() {
    if (!auth.requireAuth('/packageTeacher/review-records/review-records')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadRecords();
  },

  onShow() {
    if (auth.isLoggedIn()) {
      this.loadRecords();
    }
  },

  onPullDownRefresh() {
    this.loadRecords().then(() => wx.stopPullDownRefresh());
  },

  async loadRecords() {
    this.setData({ loading: true });
    try {
      const payload = await request({ url: '/api/mp/teachers/me/certification' });
      const teacher = payload.teacher || {};
      const reviews = payload.reviews || [];

      const records = reviews.map((r) => {
        const statusInfo = STATUS_MAP[r.status] || { text: r.status, cls: 'status-submitted' };
        return {
          year: r.yearTitle || `${r.reviewYear}年度年审`,
          date: r.reviewedAt || r.submittedAt || '待提交',
          reviewer: r.reviewer || '',
          statusText: statusInfo.text,
          statusClass: statusInfo.cls,
        };
      });

      this.setData({
        current: {
          tier: teacher.tier || '--',
          tierName: teacher.tierName || '',
          validUntil: teacher.validUntil || '--',
        },
        records,
        allRecords: records,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    const allRecords = this.data.allRecords;
    const filtered = tab === 'passed'
      ? allRecords.filter((r) => r.statusClass === 'status-approved')
      : allRecords;
    this.setData({ activeTab: tab, records: filtered });
  },
});
