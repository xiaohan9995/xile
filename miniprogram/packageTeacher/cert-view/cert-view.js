const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    teacher: null,
    certImageUrl: '',
    certLocalPath: '',
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
      // Use the authenticated download endpoint for private COS certificates.
      this.loadCertImage();
    } catch (err) {
      this.setData({ error: '加载失败', loading: false });
    }
  },

  async loadCertImage() {
    try {
      const localPath = await this.downloadCertificateImage();
      this.setData({ certImageUrl: localPath, certLocalPath: localPath });
    } catch (err) {
      // Fallback to certificateUrl if generation fails
      if (this.data.teacher && this.data.teacher.certificateUrl) {
        this.setData({ certImageUrl: this.data.teacher.certificateUrl, certLocalPath: '' });
      }
    }
  },

  downloadCertificateImage() {
    const baseUrl = app.globalData.apiBaseUrl;
    const token = auth.getToken();
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: `${baseUrl}/api/mp/teachers/me/certificate-image`,
        header: { Authorization: `Bearer ${token}` },
        success: (response) => {
          if (response.statusCode === 200 && response.tempFilePath) {
            // Verify that the download is a decodable image before exposing it
            // to preview/save. This prevents an HTML/XML error document from
            // being treated as a certificate image.
            wx.getImageInfo({
              src: response.tempFilePath,
              success: (image) => resolve(image.path || response.tempFilePath),
              fail: () => reject(new Error('证书文件不是有效图片')),
            });
            return;
          }
          reject(new Error(`证书下载失败（${response.statusCode || '未知状态'}）`));
        },
        fail: reject,
      });
    });
  },

  previewCert() {
    const url = this.data.certImageUrl;
    if (!url) {
      wx.showToast({ title: '证书生成中，请稍后', icon: 'none' });
      return;
    }
    wx.previewImage({ urls: [url], current: url });
  },

  async saveCert() {
    if (!this.data.certImageUrl) {
      wx.showToast({ title: '暂无证书可保存', icon: 'none' });
      return;
    }
    try {
      const granted = await this.requestAlbumPermission();
      if (!granted) return;
      // saveImageToPhotosAlbum only accepts a local image path. Re-download
      // here if the page was displaying a fallback remote certificate URL.
      const localPath = this.data.certLocalPath || await this.downloadCertificateImage();
      this.setData({ certLocalPath: localPath, certImageUrl: localPath });
      await new Promise((resolve, reject) => {
        wx.saveImageToPhotosAlbum({ filePath: localPath, success: resolve, fail: reject });
      });
      wx.showToast({ title: '已保存到相册', icon: 'none' });
    } catch (error) {
      wx.showToast({ title: '保存失败，请稍后重试', icon: 'none' });
    }
  },

  requestAlbumPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (setting) => {
          if (setting.authSetting['scope.writePhotosAlbum']) {
            resolve(true);
            return;
          }
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => resolve(true),
            fail: () => {
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中允许保存图片到相册后，再次点击保存。',
                confirmText: '去设置',
                success: (result) => {
                  if (!result.confirm) {
                    resolve(false);
                    return;
                  }
                  wx.openSetting({
                    success: (updated) => resolve(!!updated.authSetting['scope.writePhotosAlbum']),
                    fail: () => resolve(false),
                  });
                },
              });
            },
          });
        },
        fail: () => resolve(false),
      });
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
