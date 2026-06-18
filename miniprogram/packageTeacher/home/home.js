const { request } = require('../../utils/request');

Page({
  data: {
    teacher: {
      name: '张三',
      tier: 'L3',
      tierName: '认证导师',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=180&q=80',
      validUntil: '2028.12.31',
      daysLeft: '1095',
    },
    menus: [
      { title: '我的档案', url: '/packageTeacher/review-apply/review-apply' },
      { title: '审核记录', url: '/packageTeacher/review-records/review-records' },
      { title: '证书查看', url: '/packageTeacher/profile/profile' },
      { title: '联系客服', url: '' },
      { title: '关于', url: '' },
      { title: '设置', url: '' },
    ],
  },

  onLoad() {
    this.loadCertification();
  },

  loadCertification() {
    const teacherId = wx.getStorageSync('currentTeacherId') || 2;
    request({ url: `/api/mp/teachers/${teacherId}/certification` })
      .then((payload) => {
        const teacher = payload.teacher || {};
        if (Object.keys(teacher).length === 0) return;
        this.setData({
          teacher: {
            ...this.data.teacher,
            name: teacher.name || this.data.teacher.name,
            tier: teacher.tier || this.data.teacher.tier,
            tierName: teacher.tierName || this.data.teacher.tierName,
            avatarUrl: teacher.avatarUrl || this.data.teacher.avatarUrl,
            validUntil: teacher.validUntil || this.data.teacher.validUntil,
            daysLeft: teacher.daysLeft || this.data.teacher.daysLeft,
          },
        });
      })
      .catch(() => {});
  },

  onMenuTap(event) {
    const url = event.currentTarget.dataset.url;
    if (!url) {
      wx.showToast({ title: '该功能暂未开放', icon: 'none' });
      return;
    }
    wx.navigateTo({ url });
  },

  goBack() {
    wx.navigateBack();
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/teacher-search/teacher-search' });
  },

  logout() {
    wx.removeStorageSync('teacherId');
    wx.removeStorageSync('currentTeacherId');
    wx.showToast({ title: '已退出当前微信号', icon: 'none' });
  },
});
