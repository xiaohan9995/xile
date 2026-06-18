const { request } = require('../../utils/request');

Page({
  data: {
    teacher: {
      name: '张三',
      tierName: 'L3 认证导师',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80',
      firstCertifiedOn: '2026.06.16',
    },
  },
  onLoad() {
    const teacherId = wx.getStorageSync('currentTeacherId') || 2;
    request({ url: `/api/mp/teachers/${teacherId}/certification` })
      .then((payload) => {
        const teacher = payload.teacher || {};
        this.setData({
          teacher: {
            ...this.data.teacher,
            name: teacher.name || this.data.teacher.name,
            tierName: `${teacher.tier || ''} ${teacher.tierName || ''}`.trim() || this.data.teacher.tierName,
            avatarUrl: teacher.avatarUrl || this.data.teacher.avatarUrl,
            firstCertifiedOn: teacher.firstCertifiedOn || this.data.teacher.firstCertifiedOn,
          },
        });
      })
      .catch(() => {});
  },

  goBack() {
    wx.navigateBack();
  },

  downloadCert() {
    wx.showToast({ title: '证书图片已生成', icon: 'success' });
  },

  shareCert() {
    wx.showToast({ title: '请使用微信右上角分享', icon: 'none' });
  },

  orderPaperCert() {
    wx.showToast({ title: '纸质证书申请已记录', icon: 'none' });
  },
});
