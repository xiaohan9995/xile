const { request, uploadFile } = require('../../utils/request');
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
    primaryAction: {},
    certImageUrl: '',
    certImageLoading: false,
    avatarUploading: false,
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
          certificateUrl: t.certificateUrl || '',
        },
        primaryAction: {
          eyebrow: '认证状态',
          title: '电子认证证书',
          detail: `有效至 ${t.validUntil || '--'}`,
          actionText: '查看证书',
          url: '/packageTeacher/cert-view/cert-view',
        },
        menuItems: [
          { icon: '档', title: '我的文件', subtitle: '讲师资格及资质证明材料', url: '/packageTeacher/review-apply/review-apply' },
          { icon: '年', title: '年度记录', subtitle: '年度再教育学分审核录', url: '/packageTeacher/review-records/review-records' },
          { icon: '证', title: '证书查看', subtitle: '数字化权威资质证书预览', url: '/packageTeacher/cert-view/cert-view' },
          { icon: '服', title: '联系客服', subtitle: '注册、续签及遗失补办协助', url: '' },
          { icon: '设', title: '个人设置', subtitle: '更新头像、手机号或昵称', url: '/packageTeacher/settings/settings' },
        ],
      });
      if (t.certificateUrl) {
        this.setData({ certImageUrl: t.certificateUrl });
      } else {
        this.loadCertificatePreview();
      }
    } catch (err) {
      this.setData({
        isTeacher: false,
        primaryAction: {
          eyebrow: '教师服务',
          title: '关联教师身份',
          detail: '输入管理员提供的一次性关联码',
          actionText: '去关联',
          url: '/packageTeacher/link-teacher/link-teacher',
        },
        menuItems: [
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

  onChooseAvatar(e) {
    const avatarUrl = e.detail && e.detail.avatarUrl;
    if (!avatarUrl || this.data.avatarUploading) return;

    this.setData({ avatarUploading: true });
    uploadFile({
      url: '/api/mp/auth/update-profile',
      filePath: avatarUrl,
      name: 'avatar',
      formData: { nickname: this.data.user.nickname || '' },
    })
      .then((res) => {
        const savedAvatarUrl = res.avatarUrl || avatarUrl;
        this.setData({ 'user.avatarUrl': savedAvatarUrl });
        auth.setAvatarUrl(savedAvatarUrl);
        wx.showToast({ title: '头像已更新', icon: 'success' });
      })
      .catch(() => {
        wx.showToast({ title: '头像上传失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ avatarUploading: false });
      });
  },

  async loadCertificatePreview() {
    this.setData({ certImageLoading: true, certImageUrl: '' });
    try {
      const baseUrl = app.globalData.apiBaseUrl || 'http://127.0.0.1:5000';
      const token = auth.getToken();
      const result = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: `${baseUrl}/api/mp/teachers/me/certificate-image`,
          header: { Authorization: `Bearer ${token}` },
          success: (response) => (response.statusCode === 200 ? resolve(response) : reject(response)),
          fail: reject,
        });
      });
      this.setData({ certImageUrl: result.tempFilePath });
    } catch (err) {
      this.setData({ certImageUrl: this.data.teacher.certificateUrl || '' });
    } finally {
      this.setData({ certImageLoading: false });
    }
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/pages/index/index' });
  },
});
