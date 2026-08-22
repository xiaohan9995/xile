const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    teacher: null,
    certImageUrl: '',
    loading: true,
    error: '',
  },

  onLoad() {
    if (!auth.requireAuth('/packageTeacher/cert-view/cert-view')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadCert();
  },

  async loadCert() {
    try {
      const payload = await request({ url: '/api/mp/teachers/me/certification' });
      const t = payload.teacher || {};
      this.setData({
        teacher: {
          name: t.name || '',
          tier: t.tier || '',
          tierName: t.tierName || '',
          teacherNo: t.teacherNo || '',
          validUntil: t.validUntil || '--',
          firstCertifiedOn: t.firstCertifiedOn || '--',
          certificateUrl: t.certificateUrl || '',
          certificationStatus: t.certificationStatus || '认证有效',
        },
        loading: false,
      });
      if (t.certificateUrl) {
        this.setData({ certImageUrl: t.certificateUrl });
      } else {
        this.loadCertImage();
      }
    } catch (err) {
      this.setData({ error: '加载失败', loading: false });
    }
  },

  async loadCertImage() {
    try {
      const baseUrl = app.globalData.apiBaseUrl;
      const token = auth.getToken();
      const res = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: `${baseUrl}/api/mp/teachers/me/certificate-image`,
          header: { Authorization: `Bearer ${token}` },
          success: (r) => (r.statusCode === 200 ? resolve(r) : reject(r)),
          fail: reject,
        });
      });
      this.setData({ certImageUrl: res.tempFilePath });
    } catch (err) {
      // Fallback to certificateUrl if generation fails
      if (this.data.teacher && this.data.teacher.certificateUrl) {
        this.setData({ certImageUrl: this.data.teacher.certificateUrl });
      }
    }
  },

  previewCert() {
    const url = this.data.certImageUrl;
    if (!url) {
      wx.showToast({ title: '证书生成中，请稍后', icon: 'none' });
      return;
    }
    wx.previewImage({ urls: [url], current: url });
  },

  saveCert() {
    const url = this.data.certImageUrl;
    if (!url) {
      wx.showToast({ title: '暂无证书可保存', icon: 'none' });
      return;
    }
    wx.saveImageToPhotosAlbum({
      filePath: url,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'none' }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
