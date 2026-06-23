const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    studio: null,
    loading: false,
    error: '',
  },

  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
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
          contactText: studio.contactText || '微信/电话预约',
          tags: studio.tags || [],
          status: studio.status || '开放中',
        },
      });
    } catch (err) {
      this.setData({ error: '工作室详情暂时无法加载' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  contactStudio() {
    const studio = this.data.studio;
    if (studio && studio.phone) {
      wx.makePhoneCall({ phoneNumber: studio.phone });
    } else {
      wx.showToast({ title: '请通过微信联系工作室', icon: 'none' });
    }
  },
});
