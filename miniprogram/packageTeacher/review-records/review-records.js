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
    current: {
      tier: '--',
      tierName: '',
      validUntil: '--',
    },
    records: [],
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadRecords();
  },

  async loadRecords() {
    const teacherId = auth.getTeacherId();
    if (!teacherId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    try {
      const payload = await request({ url: `/api/mp/teachers/${teacherId}/certification` });
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
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
