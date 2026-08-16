const auth = require('../../utils/auth');
const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    steps: [
      { number: '01', title: '完善资料', text: '先核对个人资料和当前认证有效期，公开展示信息如有变化请及时更新。' },
      { number: '02', title: '持续记录教学', text: '每次教学后新增教学记录；已提交记录会在本期年审时自动带入。' },
      { number: '03', title: '提交本期年审', text: '查看截止日，保留需要引用的教学记录，并补充本期专项证明材料。' },
      { number: '04', title: '查看正式结果', text: '审核中只显示进度；结果正式发布后才会展示结论、新有效期和后续操作。' },
    ],
  },
  onLoad() {
    if (!auth.requireAuth('/packageTeacher/usage-guide/usage-guide')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
  },
  goBack() { wx.navigateBack(); },
  goReview() { wx.navigateTo({ url: '/packageTeacher/review-records/review-records' }); },
});
