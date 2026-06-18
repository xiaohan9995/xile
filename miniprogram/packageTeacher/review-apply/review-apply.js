const { request } = require('../../utils/request');

Page({
  data: {
    submitting: false,
    files: [
      { title: '专业头像照片', desc: '清晰正面免冠证件照，5MB以内', done: false, fileName: '' },
      { title: '正规机构培训证书', desc: '权威学院课程、工时证书，PDF/JPG格式', done: false, fileName: '' },
      { title: '有效身份证复印件', desc: '上传清晰的正反两面电子版', done: false, fileName: '' },
    ],
  },

  chooseFile(event) {
    const index = event.currentTarget.dataset.index;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        this.setData({
          [`files[${index}].done`]: true,
          [`files[${index}].fileName`]: file.name || '已选择认证材料',
          [`files[${index}].fileSize`]: file.size || 0,
        });
      },
    });
  },

  submitReview() {
    const selectedFiles = this.data.files
      .filter((file) => file.done)
      .map((file) => ({
        title: file.title,
        fileName: file.fileName,
        fileType: 'material',
        fileSize: file.fileSize || 0,
      }));

    if (!selectedFiles.length) {
      wx.showToast({
        title: '请先上传至少一项证明材料',
        icon: 'none',
      });
      return;
    }

    const application = wx.getStorageSync('certApplication') || {};
    this.setData({ submitting: true });
    request({
      url: '/api/mp/reviews',
      method: 'POST',
      data: {
        teacherId: application.teacherId || 1,
        reviewYear: application.reviewYear || new Date().getFullYear(),
        files: selectedFiles,
      },
    })
      .then(() => {
        wx.navigateTo({
          url: '/packageTeacher/submission-success/submission-success',
        });
      })
      .catch(() => {
        wx.showToast({
          title: '提交失败，请稍后重试',
          icon: 'none',
        });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },

  goBack() {
    wx.navigateBack();
  },
});
