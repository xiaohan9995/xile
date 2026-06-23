const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    form: {
      name: '',
      idNumber: '',
      specialization: '',
    },
    specializations: [
      '哈他经典派',
      '阿斯汤加',
      '活力流瑜伽',
      '骨骼理疗',
      '放松阴瑜伽',
    ],
    specializationIndex: -1,
    error: '',
  },

  onLoad() {
    if (!auth.requireAuth('/packageTeacher/cert-step1/cert-step1')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: e.detail.value,
      error: '',
    });
  },

  onSpecChange(e) {
    const index = e.detail.value;
    this.setData({
      specializationIndex: index,
      'form.specialization': this.data.specializations[index],
      error: '',
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goNext() {
    const { name, idNumber, specialization } = this.data.form;

    if (!name.trim()) {
      this.setData({ error: '请填写姓名' });
      return;
    }

    if (!idNumber || idNumber.length !== 18) {
      this.setData({ error: '请输入18位身份证号' });
      return;
    }

    if (!specialization) {
      this.setData({ error: '请选择瑜伽专业流派' });
      return;
    }

    const teacherId = auth.getTeacherId() || 1;
    wx.setStorageSync('certApplication', {
      ...this.data.form,
      teacherId,
      reviewYear: new Date().getFullYear(),
    });

    wx.navigateTo({
      url: '/packageTeacher/review-apply/review-apply',
    });
  },
});
