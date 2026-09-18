const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    studio: null,
    loading: false,
    error: '',
    mine: null, // { status, rejectReason } when the viewer is a lead teacher
    courseDrawerVisible: false,
  },

  onLoad(options) {
    if (!auth.requireLogin(`/pages/studio-detail/studio-detail?id=${options.id || ''}`)) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    if (options.id) {
      this.loadStudio(options.id);
    }
  },

  onShow() {
    // Re-check ownership in case the teacher submitted/withdrew and came back.
    if (this.data.studio && this.data.studio.id) {
      this.loadStudio(this.data.studio.id);
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
          id,
          images,
          coverImage: images[0],
          ownerTeachers,
          courseIntro: studio.courseIntro || '',
          contactText: studio.contactText || '微信/电话预约',
          tags: studio.tags || [],
          status: studio.status || '开放中',
        },
        mine: studio.mine || null,
      });
    } catch (err) {
      this.setData({ error: '工作室详情暂时无法加载' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goEdit() {
    const id = this.data.studio && this.data.studio.id;
    if (!id) return;
    wx.navigateTo({ url: `/packageTeacher/studio-submit/studio-submit?id=${id}` });
  },

  withdraw() {
    const id = this.data.studio && this.data.studio.id;
    if (!id) return;
    wx.showModal({
      title: '撤回提交',
      content: '撤回后该次提交将不再等待审批，你已填写的内容会保留，可修改后重新提交。',
      confirmText: '撤回',
      confirmColor: '#2f5140',
      cancelText: '取消',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await request({ url: `/api/mp/teachers/me/studios/${id}/withdraw`, method: 'POST' });
          wx.showToast({ title: '已撤回', icon: 'none' });
          this.loadStudio(id);
        } catch (error) {
          wx.showToast({ title: error.message || '撤回失败，请稍后重试', icon: 'none' });
        }
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },

  openCourseDrawer() {
    if (!this.data.studio || !this.data.studio.courseIntro) return;
    this.setData({ courseDrawerVisible: true });
  },

  closeCourseDrawer() {
    this.setData({ courseDrawerVisible: false });
  },

  noop() {},

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

  // 联系方式可能是「微信/电话预约」这类纯文案，只有能解析出手机号时才唤起拨号盘。
  callStudio() {
    const studio = this.data.studio;
    const phone = this.extractPhone(studio && studio.phone) || this.extractPhone(studio && studio.contactText);
    if (!phone) {
      wx.showToast({ title: '该工作室暂未配置联系电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: phone });
  },

  extractPhone(value) {
    if (!value) return '';
    const matched = String(value).match(/1[3-9]\d{9}|0\d{2,3}-?\d{7,8}/);
    if (!matched) return '';
    return matched[0].replace(/-/g, '');
  },
});
