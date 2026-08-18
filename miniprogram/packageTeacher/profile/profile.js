const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    isTeacher: false,
    teacher: {
      name: '',
      tier: '',
      tierName: '',
      avatarUrl: '',
      bio: '',
      validUntil: '',
      daysLeft: 0,
    },
    user: {
      nickname: '',
      avatarUrl: '',
    },
    menuItems: [],
  },

  onLoad() {
    if (!auth.requireLogin('/packageTeacher/profile/profile')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadProfile();
  },

  onShow() {
    this.setData({
      'user.avatarUrl': auth.getAvatarUrl(),
      'user.nickname': auth.getNickname(),
    });
  },

  async loadProfile() {
    try {
      const payload = await request({ url: '/api/mp/teachers/me/certification', silent: true });
      const t = payload.teacher || {};
      this.setData({
        isTeacher: true,
        teacher: {
          name: t.name || '',
          tier: t.tier || '',
          tierName: t.tierName || '',
          avatarUrl: t.avatarUrl || '',
          bio: t.bio || '',
          validUntil: t.validUntil || '--',
          daysLeft: t.daysLeft || 0,
        },
        menuItems: [
          { icon: '档', title: '我的文件', subtitle: '讲师资格及资质证明材料', url: '/packageTeacher/review-apply/review-apply' },
          { icon: '年', title: '年度记录', subtitle: '年度再教育学分审核录', url: '/packageTeacher/review-records/review-records' },
          { icon: '证', title: '证书查看', subtitle: '数字化权威资质证书预览', url: '/packageTeacher/cert-view/cert-view' },
          { icon: '服', title: '联系客服', subtitle: '注册、续签及遗失补办协助', url: '' },
          { icon: '设', title: '个人设置', subtitle: '更新头像、手机号或昵称', url: '/packageTeacher/settings/settings' },
        ],
      });
    } catch (err) {
      this.setData({
        isTeacher: false,
        menuItems: [
          { icon: '登', title: '关联教师账号', subtitle: '使用管理员提供的教师账号登录', url: '/packageTeacher/account-login/account-login?returnUrl=%2FpackageTeacher%2Fhome%2Fhome' },
          { icon: '服', title: '认证咨询', subtitle: '了解教师档案关联与认证要求', url: '' },
          { icon: '设', title: '个人设置', subtitle: '更新头像、手机号或昵称', url: '/packageTeacher/settings/settings' },
        ],
      });
    }
  },

  onMenuTap(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) {
      wx.showToast({ title: '该功能即将开放', icon: 'none' });
      return;
    }
    wx.navigateTo({ url });
  },

  goBack() {
    wx.navigateBack();
  },
});
