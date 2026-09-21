const { request, uploadFile } = require('../../utils/request');
const auth = require('../../utils/auth');
const app = getApp();

// 后端下发的图片可能是 API 相对路径（"/uploads/..."），<image> 无法解析，
// 需要补上 API 域名；已是完整 http(s) 地址则直接使用。
const displayFileUrl = (url) => {
  if (!url) return '';
  const baseUrl = (app && app.globalData && app.globalData.apiBaseUrl) || '';
  if (/^https?:\/\//i.test(url)) return url;
  return baseUrl ? `${baseUrl}${url}` : url;
};

Page({
  data: {
    statusBarHeight: 20,
    loading: false,
    saving: false,
    uploadingHome: false,
    uploadingStudio: false,
    homeUrl: '',
    studioUrl: '',
  },

  onLoad() {
    if (!auth.requireAuth('/packageTeacher/banner-settings/banner-settings')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadBanners();
  },

  async loadBanners() {
    this.setData({ loading: true });
    try {
      const data = await request({ url: '/api/mp/banners' });
      this.setData({ homeUrl: displayFileUrl(data.home), studioUrl: displayFileUrl(data.studio) });
    } catch (e) {
      wx.showToast({ title: e.message || '横幅加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 预签名直传 COS，绕开未备案 API 域名；返回可预览的下载地址。
  async uploadBannerImage(path, filename) {
    const presign = await request({
      url: '/api/mp/upload/presign',
      method: 'POST',
      data: { filename, prefix: 'banners' },
    });
    if (presign.uploadUrl === '/api/mp/upload/file') {
      const result = await uploadFile({ url: '/api/mp/upload/file', filePath: path, name: 'file' });
      return result.url || result.fileKey;
    }
    await uploadFile({ url: presign.uploadUrl, filePath: path, name: 'file' });
    return presign.downloadUrl || presign.publicUrl;
  },

  chooseImage(e) {
    const slot = e.currentTarget.dataset.slot; // 'home' | 'studio'
    const uploadingKey = slot === 'home' ? 'uploadingHome' : 'uploadingStudio';
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { wx.showToast({ title: '图片不能超过10MB', icon: 'none' }); return; }
        const path = file.tempFilePath;
        const matched = path.match(/[\w-]+\.(jpg|jpeg|png|gif|webp)$/i);
        const filename = matched ? matched[0] : 'banner.jpg';
        this.setData({ [uploadingKey]: true });
        try {
          wx.showLoading({ title: '上传中' });
          const url = await this.uploadBannerImage(path, filename);
          this.setData({ [`${slot}Url`]: displayFileUrl(url) });
        } catch (err) {
          wx.showToast({ title: err.message || '上传失败', icon: 'none' });
        } finally {
          wx.hideLoading();
          this.setData({ [uploadingKey]: false });
        }
      },
    });
  },

  async save() {
    this.setData({ saving: true });
    try {
      const result = await request({
        url: '/api/mp/banner-config',
        method: 'PUT',
        data: { home: this.data.homeUrl, studio: this.data.studioUrl },
      });
      this.setData({ homeUrl: displayFileUrl(result.home), studioUrl: displayFileUrl(result.studio) });
      wx.showToast({ title: '已保存', icon: 'none' });
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
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
