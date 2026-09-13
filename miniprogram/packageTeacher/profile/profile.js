const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

const displayAvatarUrl = (url) => {
  if (!url || !/^https:\/\/(?:thirdwx|wx)\.qlogo\.cn\//i.test(url)) return url || '';
  const baseUrl = app.globalData.apiBaseUrl || '';
  return baseUrl ? `${baseUrl}/api/mp/auth/avatar-proxy?url=${encodeURIComponent(url)}` : url;
};

Page({
  data: {
    statusBarHeight: 20,
    isTeacher: false,
    teacher: {
      name: '',
      xileName: '',
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
    canSubmitReview: false,
    reviewBlockedReason: '',
    menuItems: [],
  },

  onLoad() {
    if (!auth.requireLogin('/packageTeacher/profile/profile')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadProfile();
  },

  onShow() {
    this.setData({
      'user.avatarUrl': displayAvatarUrl(auth.getAvatarUrl()),
      'user.nickname': auth.getNickname(),
    });
  },

  async loadProfile() {
    try {
      const payload = await request({ url: '/api/mp/teachers/me/certification', silent: true });
      const t = payload.teacher || {};
      const reviewWindowOpen = Boolean(payload.reviewWindow && payload.reviewWindow.isOpen);
      const certificationExpired = t.daysLeft != null && t.daysLeft <= 0;
      const canSubmitReview = certificationExpired || reviewWindowOpen;
      const reviewBlockedReason = certificationExpired
        ? ''
        : (reviewWindowOpen ? '' : (t.daysLeft != null && t.daysLeft > 0 ? 'certification-valid' : 'review-not-open'));
      this.setData({
        isTeacher: true,
        canSubmitReview,
        reviewBlockedReason,
        teacher: {
          name: t.name || '',
          id: t.id || null,
          xileName: t.xileName || '',
          tier: t.tier || '',
          tierName: t.tierName || '',
          avatarUrl: displayAvatarUrl(t.avatarUrl),
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
          { icon: '我', title: '我的信息', subtitle: '查看对外公开显示的师资页面', url: `/pages/teacher-detail/teacher-detail?id=${t.id}` },
          { icon: '教', title: '教学记录', subtitle: '请定期提交你的教学传播活动记录', url: '/packageTeacher/teaching-records/teaching-records' },
          { icon: '服', title: '服务记录', subtitle: '请定期提交你的服务推广活动记录', url: '/packageTeacher/service-records/service-records' },
          { icon: '年', title: '年审信息', subtitle: '查看年审进度及提交记录', url: '/packageTeacher/review-records/review-records' },
          { icon: '设', title: '个人设置', subtitle: '更新头像、密码及对外显示信息', url: '/packageTeacher/settings/settings' },
          { icon: '询', title: '咨询服务', subtitle: '查询师资管理小助手信息', url: '', action: 'consultation' },
        ],
      });
      // Certificate objects may be private in COS. Always download through
      // the authenticated endpoint so the card receives a readable temp file.
      this.loadCertificatePreview();
    } catch (err) {
      this.setData({
        isTeacher: false,
        primaryAction: {
          eyebrow: '教师服务',
          title: '关联教师身份',
          detail: '输入教师身份证号和初始密码',
          actionText: '去关联',
          url: '/packageTeacher/link-teacher/link-teacher',
        },
        menuItems: [
          { icon: '服', title: '认证咨询', subtitle: '了解教师档案关联与认证要求', url: '' },
          { icon: '设', title: '个人设置', subtitle: '更新头像、手机号或喜乐名', url: '/packageTeacher/settings/settings' },
        ],
      });
    }
  },

  onMenuTap(e) {
    const url = e.currentTarget.dataset.url;
    const action = e.currentTarget.dataset.action;
    if (action === 'submit-review' && !this.data.canSubmitReview) {
      const title = this.data.reviewBlockedReason === 'certification-valid'
        ? '当前认证尚未到期'
        : '当前尚未到年审提交时间';
      wx.showToast({ title, icon: 'none' });
      return;
    }
    if (action === 'consultation') {
      wx.showToast({ title: '师资管理小助手信息即将开放', icon: 'none' });
      return;
    }
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
    const fs = wx.getFileSystemManager();
    new Promise((resolve, reject) => {
      fs.readFile({
        filePath: avatarUrl,
        encoding: 'base64',
        success: resolve,
        fail: reject,
      });
    })
      .then((file) => request({
        url: '/api/mp/auth/update-profile',
        method: 'POST',
        data: {
          nickname: this.data.user.nickname || '',
          avatarBase64: file.data,
          avatarFilename: 'avatar.jpg',
          avatarContentType: 'image/jpeg',
        },
      }))
      .then((res) => {
        const savedAvatarUrl = displayAvatarUrl(res.avatarUrl || avatarUrl);
        this.setData({
          'user.avatarUrl': savedAvatarUrl,
          'teacher.avatarUrl': res.teacherAvatarUrl || savedAvatarUrl,
        });
        auth.setAvatarUrl(savedAvatarUrl);
        // Refresh the teacher record from the server as well. This keeps the
        // linked teacher avatar in sync after returning to the profile page.
        this.loadProfile();
        wx.showToast({ title: '头像已更新', icon: 'none' });
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
      const baseUrl = app.globalData.apiBaseUrl;
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
