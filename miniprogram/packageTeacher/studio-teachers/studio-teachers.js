const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    id: null,
    loading: true,
    studioName: '',
    teachers: [],
    myTeacherId: null,
    // 搜索添加
    keyword: '',
    searching: false,
    searchResults: [],
    searched: false,
    searchError: '',
  },

  onLoad(options) {
    if (!auth.requireLogin('/packageTeacher/studio-teachers/studio-teachers')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    const id = options && options.id ? Number(options.id) : null;
    if (!id) {
      this.setData({ loading: false, searchError: '缺少工作室参数' });
      return;
    }
    this.setData({ id, myTeacherId: auth.getTeacherId() });
    this.loadStudio();
  },

  async loadStudio() {
    this.setData({ loading: true });
    try {
      const studio = await request({ url: `/api/mp/studios/${this.data.id}` });
      if (!studio.mine || !studio.mine.manager) {
        wx.showToast({ title: '仅工作室管理员可管理教师', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1200);
        return;
      }
      const myId = String(this.data.myTeacherId);
      const teachers = (studio.ownerTeachers || []).map((t) => ({
        id: t.id,
        name: t.name || t.xileName || t.realName || '教师',
        xileName: t.xileName || '',
        avatarUrl: t.avatarUrl || '',
        // WXML 不支持 String() 函数调用，预先算好是否为自己
        isMe: String(t.id) === myId,
      }));
      this.setData({ studioName: studio.name, teachers, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value || '' });
  },

  async search() {
    const keyword = (this.data.keyword || '').trim();
    if (!keyword) {
      wx.showToast({ title: '请输入姓名 / 喜乐名 / 证书编号', icon: 'none' });
      return;
    }
    this.setData({ searching: true, searchError: '', searched: false });
    try {
      const result = await request({ url: `/api/mp/teachers/search?mode=name&q=${encodeURIComponent(keyword)}&pageSize=20` });
      const currentIds = new Set(this.data.teachers.map((t) => String(t.id)));
      const items = (result.items || []).map((t) => ({
        id: t.id,
        name: t.name || t.xileName || '教师',
        xileName: t.xileName || '',
        tierName: t.tierName || '',
        city: t.city || '',
        avatarUrl: t.avatarUrl || '',
        added: currentIds.has(String(t.id)),
      }));
      this.setData({ searchResults: items, searched: true, searching: false });
    } catch (error) {
      this.setData({ searching: false, searchError: error.message || '搜索失败，请稍后重试' });
    }
  },

  async addTeacher(e) {
    const id = e.currentTarget.dataset.id;
    const teacher = (this.data.searchResults || []).find((t) => String(t.id) === String(id));
    if (!teacher || teacher.added) return;
    try {
      await request({
        url: `/api/mp/teachers/me/studios/${this.data.id}/teachers`,
        method: 'POST',
        data: { teacherId: id },
      });
      wx.showToast({ title: '已添加', icon: 'none' });
      // 更新搜索结果里的 added 标记，并刷新列表
      const searchResults = this.data.searchResults.map((t) => ({
        ...t,
        added: String(t.id) === String(id) ? true : t.added,
      }));
      this.setData({ searchResults });
      this.loadStudio();
    } catch (error) {
      wx.showToast({ title: error.message || '添加失败', icon: 'none' });
    }
  },

  removeTeacher(e) {
    const id = e.currentTarget.dataset.id;
    const teacher = (this.data.teachers || []).find((t) => String(t.id) === String(id));
    if (!teacher) return;
    if (String(id) === String(this.data.myTeacherId)) {
      wx.showToast({ title: '不能删除自己', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '删除教师',
      content: `确认将「${teacher.name}」从主理教师中移除？`,
      confirmText: '删除',
      confirmColor: '#c0392b',
      cancelText: '取消',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await request({
            url: `/api/mp/teachers/me/studios/${this.data.id}/teachers/${id}`,
            method: 'DELETE',
          });
          wx.showToast({ title: '已删除', icon: 'none' });
          this.loadStudio();
        } catch (error) {
          wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
