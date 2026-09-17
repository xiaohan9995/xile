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
      const images = Array.isArray(studio.images) && studio.images.length
        ? studio.images
        : (studio.coverUrl ? [studio.coverUrl] : ['https://images.unsplash.com/photo-1593810450967-f9c42742e326?auto=format&fit=crop&w=720&q=86']);
      const ownerTeachers = (Array.isArray(studio.ownerTeachers) && studio.ownerTeachers.length)
        ? studio.ownerTeachers
        : (studio.ownerTeacherName ? [{ name: studio.ownerTeacherName, realName: studio.ownerTeacherRealName || '' }] : []);
      this.setData({
        studio: {
          ...studio,
          images,
          coverImage: images[0],
          ownerTeachers,
          courseIntro: studio.courseIntro || '',
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
      // Map clients prominently display `name`; use the selected street
      // address rather than the studio brand so navigation is unambiguous.
      name: studio.address || studio.name || '工作室地址',
      address: studio.address || studio.name || '',
      scale: 16,
    });
  },
});
