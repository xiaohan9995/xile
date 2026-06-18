const { request } = require('../../utils/request');

const statusMap = {
  submitted: '审核中',
  approved: '已通过',
  rejected: '已驳回',
  draft: '草稿',
  exempt: '无需年审',
};

Page({
  data: {
    current: {
      tier: 'L3',
      tierName: '认证导师',
      validUntil: '2028.12.31',
    },
    records: [
      { year: '2024年度年审', date: '2024.06.20', reviewer: '曾超群', statusText: '已通过' },
      { year: '2022年度年审', date: '2022.06.18', reviewer: '曾超群', statusText: '已通过' },
      { year: '2020年度年审', date: '2020.06.15', reviewer: '曾超群', statusText: '已通过' },
    ],
  },

  onLoad() {
    this.loadRecords();
  },

  loadRecords() {
    const teacherId = wx.getStorageSync('currentTeacherId') || 2;
    request({ url: `/api/mp/teachers/${teacherId}/certification` })
      .then((payload) => {
        const teacher = payload.teacher || {};
        const records = (payload.reviews || []).map((r) => ({
          year: r.yearTitle || `${r.reviewYear}年度年审`,
          date: r.reviewedAt || r.submittedAt || '待提交',
          reviewer: r.reviewer || '曾超群',
          statusText: statusMap[r.status] || r.status,
        }));
        this.setData({
          current: {
            tier: teacher.tier || this.data.current.tier,
            tierName: teacher.tierName || this.data.current.tierName,
            validUntil: teacher.validUntil || this.data.current.validUntil,
          },
          records: records.length ? records : this.data.records,
        });
      })
      .catch(() => {});
  },

  goBack() {
    wx.navigateBack();
  },

  onShowAll() {
    wx.showToast({ title: '已展示全部记录', icon: 'none' });
  },
});
