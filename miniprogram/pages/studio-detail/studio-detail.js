const { request } = require('../../utils/request');

Page({
  data: {
    studio: null,
    loading: false,
    error: '',
  },

  onLoad(options) {
    if (options.id) {
      this.loadStudio(options.id);
    }
  },

  async loadStudio(id) {
    this.setData({ loading: true, error: '' });
    try {
      const studio = await request({ url: `/api/mp/studios/${id}` });
      this.setData({
        studio: {
          ...studio,
          coverImage: studio.imageUrl || studio.coverUrl || 'https://images.unsplash.com/photo-1593810450967-f9c42742e326?auto=format&fit=crop&w=720&q=86',
          ownerTeacherName: studio.ownerTeacherName || '认证导师',
          openingHours: studio.openingHours || '10:00 - 21:00',
          contactText: studio.contactText || '有赞学堂预约',
        },
      });
    } catch (error) {
      this.setData({ error: '工作室详情暂时无法加载' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  bookStudio() {
    wx.showToast({ title: '首期接入有赞学堂外链', icon: 'none' });
  },
});
