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
    if (!auth.requireLogin(`/pages/studio-detail/studio-detail?id=${options.id || ''}`)) return;
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

  openMap() {
    const studio = this.data.studio;
    const latitude = Number(studio && studio.latitude);
    const longitude = Number(studio && studio.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      wx.showToast({ title: '该工作室暂未配置地图位置', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude,
      longitude,
      name: studio.name || '工作室',
      address: studio.address || '',
      scale: 16,
    });
  },
});
