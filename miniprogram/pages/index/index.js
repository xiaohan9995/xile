const { request } = require('../../utils/request');

Page({
  data: {
    stats: [
      { value: '1,286', label: '认证教师人数' },
      { value: '326', label: '有教学堂数量' },
    ],
  },

  onLoad() {
    this.loadStats();
  },

  async loadStats() {
    try {
      const payload = await request({ url: '/api/mp/stats/overview' });
      if (payload) {
        this.setData({
          stats: [
            {
              value: String(payload.totalTeachers ?? 1286).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
              label: '认证教师人数',
            },
            {
              value: String(payload.totalStudios ?? 326).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
              label: '有教学堂数量',
            },
          ],
        });
      }
    } catch (e) {
      // 保留默认数据
    }
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/teacher-search/teacher-search' });
  },

  goStudios() {
    wx.navigateTo({ url: '/pages/studios/studios' });
  },

  goMyCert() {
    wx.navigateTo({ url: '/packageTeacher/home/home' });
  },
});
