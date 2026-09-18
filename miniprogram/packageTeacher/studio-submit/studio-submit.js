const { request, uploadFile } = require('../../utils/request');
const auth = require('../../utils/auth');
const app = getApp();

const STATUS_LABEL = {
  open: '已公开',
  pending: '待审批',
  incomplete: '未提交',
};

Page({
  data: {
    statusBarHeight: 20,
    loading: false,
    saving: false,
    studios: [],
    editing: null, // the studio currently being edited
    editingId: '',
    // form holds the editable display fields (mirrors backend `fields`)
    form: {
      address: '', contact: '', tags: [], courseIntro: '', images: [], latitude: null, longitude: null,
    },
    tagInput: '',
    maxTags: 8,
    maxImages: 9,
    uploading: false,
    directEdit: false, // 从详情页「修改」按钮直接进入编辑模式
  },

  onLoad(options) {
    if (!auth.requireAuth('/packageTeacher/studio-submit/studio-submit')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    // 直接以编辑模式进入（从工作室详情页「修改」按钮跳转）
    if (options && options.id) {
      this.setData({ editingId: String(options.id), directEdit: true });
      this.loadStudioForEdit(String(options.id));
      return;
    }
    this.loadStudios();
  },

  onShow() {
    if (!auth.isLoggedIn() || !auth.isTeacher()) {
      auth.requireAuth('/packageTeacher/studio-submit/studio-submit');
      return;
    }
    // 直接编辑模式下不重复加载列表
    if (this.data.editingId && !this.data.editing) return;
    this.loadStudios();
  },

  async loadStudios() {
    this.setData({ loading: true });
    try {
      const data = await request({ url: '/api/mp/teachers/me/studios' });
      this.setData({ studios: data.items || [] });
    } catch (error) {
      wx.showToast({ title: error.message || '工作室信息加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadStudioForEdit(id) {
    this.setData({ loading: true });
    try {
      const data = await request({ url: '/api/mp/teachers/me/studios' });
      const studio = (data.items || []).find((item) => String(item.id) === String(id));
      if (!studio) {
        wx.showToast({ title: '未找到该工作室', icon: 'none' });
        return;
      }
      this.fillEditor(studio);
    } catch (error) {
      wx.showToast({ title: error.message || '工作室信息加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  fillEditor(studio) {
    const f = studio.fields || {};
    this.setData({
      editing: studio,
      editingId: String(studio.id),
      form: {
        address: f.address || '',
        contact: f.contact || '',
        tags: f.tags || [],
        courseIntro: f.courseIntro || '',
        images: f.images || [],
        latitude: f.latitude != null ? f.latitude : null,
        longitude: f.longitude != null ? f.longitude : null,
      },
    });
  },

  statusLabel(status) {
    return STATUS_LABEL[status] || status;
  },

  input(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
  },

  addTag() {
    const tag = (this.data.tagInput || '').trim();
    if (!tag) return;
    if (tag.length > 6) { wx.showToast({ title: '每个标签最多 6 个字', icon: 'none' }); return; }
    const tags = this.data.form.tags;
    if (tags.length >= this.data.maxTags) { wx.showToast({ title: `标签最多 ${this.data.maxTags} 个`, icon: 'none' }); return; }
    if (tags.indexOf(tag) !== -1) { wx.showToast({ title: '标签已存在', icon: 'none' }); return; }
    this.setData({ 'form.tags': [...tags, tag], tagInput: '' });
  },

  removeTag(e) {
    const index = Number(e.currentTarget.dataset.index);
    const tags = this.data.form.tags.slice();
    tags.splice(index, 1);
    this.setData({ 'form.tags': tags });
  },

  chooseImages() {
    const remaining = this.data.maxImages - this.data.form.images.length;
    if (remaining <= 0) { wx.showToast({ title: `图片最多 ${this.data.maxImages} 张`, icon: 'none' }); return; }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const files = res.tempFiles || [];
        for (const file of files) {
          if (file.size > 10 * 1024 * 1024) { wx.showToast({ title: '图片不能超过10MB', icon: 'none' }); continue; }
          const path = file.tempFilePath;
          const matched = path.match(/[\w-]+\.(jpg|jpeg|png|gif|webp)$/i);
          const filename = matched ? matched[0] : 'studio.jpg';
          try {
            wx.showLoading({ title: '上传图片中' });
            const result = await uploadFile({ url: '/api/mp/upload/evidence', filePath: path, name: 'file', formData: { filename } });
            this.setData({ 'form.images': [...this.data.form.images, result.url] });
          } catch (error) {
            wx.showToast({ title: error.message || '图片上传失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      },
    });
  },

  removeImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const images = this.data.form.images.slice();
    images.splice(index, 1);
    this.setData({ 'form.images': images });
  },

  // 点击工作室卡片跳转到工作室详情页（统一公开展示入口，修改操作在详情页内）
  openStudioDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/studio-detail/studio-detail?id=${id}` });
  },

  closeEditor() {
    this.setData({ editing: null, editingId: '', form: { address: '', contact: '', tags: [], courseIntro: '', images: [], latitude: null, longitude: null } });
  },

  // 用微信内置地图选点，让地图标记与详细地址保持一致。
  chooseLocation() {
    wx.chooseLocation({
      latitude: this.data.form.latitude || undefined,
      longitude: this.data.form.longitude || undefined,
      success: (res) => {
        const patch = {
          'form.latitude': res.latitude,
          'form.longitude': res.longitude,
        };
        // 选点名称优先回填地址，若用户已手填详细地址则保留手填值。
        if (!this.data.form.address && res.name) {
          patch['form.address'] = res.name;
        }
        this.setData(patch);
        wx.showToast({ title: '已更新地图位置', icon: 'none' });
      },
      fail: () => {
        // 用户主动取消无需提示。
      },
    });
  },

  async submit() {
    const { form, editingId } = this.data;
    if (!form.address.trim()) {
      wx.showToast({ title: '请填写地址', icon: 'none' });
      return;
    }
    const data = {
      address: form.address,
      contact: form.contact,
      tags: form.tags.join(','),
      courseIntro: form.courseIntro,
      images: form.images,
    };
    if (form.latitude != null && form.longitude != null) {
      data.latitude = form.latitude;
      data.longitude = form.longitude;
    }
    this.setData({ saving: true });
    try {
      await request({ url: `/api/mp/teachers/me/studios/${editingId}`, method: 'PUT', data });
      wx.showToast({ title: '已提交，等待管理员审批', icon: 'none' });
      if (this.data.directEdit) {
        // 直接编辑模式下提交后返回工作室详情页
        setTimeout(() => wx.navigateBack(), 600);
        return;
      }
      this.closeEditor();
      await this.loadStudios();
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/pages/index/index' });
  },
});
