const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    submitting: false,
    files: [
      { title: '专业头像照片', desc: '清晰正面免冠证件照，5MB以内', icon: '📷', done: false, fileName: '' },
      { title: '培训证书', desc: '权威机构课程证书，PDF/JPG格式', icon: '📄', done: false, fileName: '' },
      { title: '身份证复印件', desc: '清晰正反面电子版', icon: '🪪', done: false, fileName: '' },
    ],
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
  },

  chooseFile(e) {
    const index = e.currentTarget.dataset.index;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        this.setData({
          [`files[${index}].done`]: true,
          [`files[${index}].fileName`]: file.name || '已选择文件',
          [`files[${index}].fileSize`]: file.size || 0,
        });
      },
    });
  },

  submitReview() {
    const selectedFiles = this.data.files
      .filter((f) => f.done)
      .map((f) => ({
        title: f.title,
        fileName: f.fileName,
        fileType: 'material',
        fileSize: f.fileSize || 0,
      }));

    if (selectedFiles.length === 0) {
      wx.showToast({ title: '请先上传至少一项证明材料', icon: 'none' });
      return;
    }

    const application = wx.getStorageSync('certApplication') || {};
    const teacherId = auth.getTeacherId() || application.teacherId || 1;

    this.setData({ submitting: true });
    request({
      url: '/api/mp/reviews',
      method: 'POST',
      data: {
        teacherId,
        reviewYear: application.reviewYear || new Date().getFullYear(),
        name: application.name || '',
        idNumber: application.idNumber || '',
        specialization: application.specialization || '',
        files: selectedFiles,
      },
    })
      .then(() => {
        wx.removeStorageSync('certApplication');
        wx.navigateTo({ url: '/packageTeacher/submission-success/submission-success' });
      })
      .catch(() => {
        wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },

  goBack() {
    wx.navigateBack();
  },
});
