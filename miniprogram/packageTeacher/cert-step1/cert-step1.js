Page({
  data: {
    form: {
      name: '张伟',
      idNumber: '',
      specialization: '流瑜伽',
    },
    error: '',
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value,
      error: '',
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goNext() {
    if (!this.data.form.name || !this.data.form.specialization) {
      this.setData({ error: '请先填写姓名与认证方向' });
      return;
    }
    wx.setStorageSync('certApplication', {
      ...this.data.form,
      teacherId: 1,
      reviewYear: new Date().getFullYear(),
    });
    wx.navigateTo({
      url: '/packageTeacher/review-apply/review-apply',
    });
  },
});
