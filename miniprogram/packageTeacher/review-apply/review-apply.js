const { request, uploadFile } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    submitting: false,
    files: [
      { title: '专业头像照片', desc: '清晰正面免冠证件照，5MB以内', icon: '📷', done: false, fileName: '', tempPath: '', fileKey: '' },
      { title: '培训证书', desc: '权威机构课程证书，PDF/JPG格式', icon: '📄', done: false, fileName: '', tempPath: '', fileKey: '' },
      { title: '身份证复印件', desc: '清晰正反面电子版', icon: '🪪', done: false, fileName: '', tempPath: '', fileKey: '' },
    ],
  },

  onLoad() {
    if (!auth.requireAuth('/packageTeacher/review-apply/review-apply')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
  },

  chooseFile(e) {
    const index = e.currentTarget.dataset.index;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['jpg', 'jpeg', 'png', 'pdf'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          wx.showToast({ title: '文件不能超过5MB', icon: 'none' });
          return;
        }
        this.setData({
          [`files[${index}].done`]: true,
          [`files[${index}].fileName`]: file.name || '已选择文件',
          [`files[${index}].fileSize`]: file.size || 0,
          [`files[${index}].tempPath`]: file.path,
          [`files[${index}].fileKey`]: '',
        });
      },
    });
  },

  async uploadSingleFile(file) {
    if (file.fileKey) return file.fileKey;

    try {
      const presign = await request({
        url: '/api/mp/upload/presign',
        method: 'POST',
        data: { filename: file.fileName },
      });

      if (presign.uploadUrl === '/api/mp/upload/file') {
        const result = await uploadFile({
          url: '/api/mp/upload/file',
          filePath: file.tempPath,
          name: 'file',
        });
        return result.fileKey;
      } else {
        await uploadFile({
          url: presign.uploadUrl,
          filePath: file.tempPath,
          name: 'file',
        });
        return presign.fileKey;
      }
    } catch (err) {
      throw new Error(`上传 ${file.title} 失败`);
    }
  },

  async submitReview() {
    if (this.data.submitting) return;
    const selectedFiles = this.data.files.filter((f) => f.done);

    if (selectedFiles.length === 0) {
      wx.showToast({ title: '请先上传至少一项证明材料', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      // Clear stale fileKeys before re-upload to avoid using expired presign URLs
      for (let i = 0; i < this.data.files.length; i++) {
        if (this.data.files[i].done) {
          this.setData({ [`files[${i}].fileKey`]: '' });
        }
      }

      // Upload all files first
      for (let i = 0; i < this.data.files.length; i++) {
        const file = this.data.files[i];
        if (!file.done) continue;
        wx.showLoading({ title: `上传中 ${i + 1}/${selectedFiles.length}` });
        const fileKey = await this.uploadSingleFile(file);
        this.setData({ [`files[${i}].fileKey`]: fileKey });
      }
      wx.hideLoading();

      // Submit review with file keys
      const application = wx.getStorageSync('certApplication') || {};
      const filesPayload = this.data.files
        .filter((f) => f.done && f.fileKey)
        .map((f) => ({
          title: f.title,
          fileName: f.fileName,
          fileKey: f.fileKey,
          fileType: 'material',
          fileSize: f.fileSize || 0,
        }));

      await request({
        url: '/api/mp/reviews',
        method: 'POST',
        data: {
          reviewYear: application.reviewYear || new Date().getFullYear(),
          name: application.name || '',
          idNumber: application.idNumber || '',
          specialization: application.specialization || '',
          files: filesPayload,
        },
      });

      wx.removeStorageSync('certApplication');
      wx.navigateTo({ url: '/packageTeacher/submission-success/submission-success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
