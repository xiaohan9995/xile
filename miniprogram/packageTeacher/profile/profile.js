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
    if (!auth.requireAuth('/packageTeacher/profile/profile')) return;
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
          { icon: '📁', title: '我的文件', subtitle: '讲师资格及资质证明材料', url: '/packageTeacher/review-apply/review-apply' },
          { icon: '📋', title: '年度记录', subtitle: '年度再教育学分审核录', url: '/packageTeacher/review-records/review-records' },
          { icon: '🏅', title: '证书查看', subtitle: '数字化权威资质证书预览', url: '/packageTeacher/cert-view/cert-view' },
          { icon: '💬', title: '联系客服', subtitle: '注册、续签及遗失补办协助', url: '' },
          { icon: '⚙', title: '个人设置', subtitle: '更新头像、手机号或昵称', url: '/packageTeacher/settings/settings' },
        ],
      });
    } catch (err) {
      this.setData({
        isTeacher: false,
        menuItems: [
          { icon: '📝', title: '申请认证', subtitle: '提交资料开始教师资格认证', url: '/packageTeacher/cert-step1/cert-step1' },
          { icon: '💬', title: '联系客服', subtitle: '了解认证流程及要求', url: '' },
          { icon: '⚙', title: '个人设置', subtitle: '更新头像、手机号或昵称', url: '/packageTeacher/settings/settings' },
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
