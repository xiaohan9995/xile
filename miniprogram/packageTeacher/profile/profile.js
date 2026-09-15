const { request } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

// WeChat avatars (qlogo.cn) go through the backend proxy; API-relative
// storage paths ("/uploads/avatars/...") need the API base URL prefixed so
// the <image> tag can load them.
const displayAvatarUrl = (url) => {
  if (!url) return '';
  const baseUrl = app.globalData.apiBaseUrl || '';
  if (/^https:\/\/(?:thirdwx|wx)\.qlogo\.cn\//i.test(url)) {
    return baseUrl ? `${baseUrl}/api/mp/auth/avatar-proxy?url=${encodeURIComponent(url)}` : url;
  }
  if (/^https?:\/\//i.test(url)) return url;
  return baseUrl ? `${baseUrl}${url}` : url;
};

// Guests (not logged in yet) browse the same 讲师服务 list so they can see
// what a teacher account offers; every entry stays non-navigable for them.
const teacherMenuItems = (teacherId) => [
  { icon: '我', title: '我的信息', subtitle: '查看对外公开显示的师资页面', url: `/pages/teacher-detail/teacher-detail?id=${teacherId || ''}` },
  { icon: '教', title: '教学记录', subtitle: '请定期提交你的教学传播活动记录', url: '/packageTeacher/teaching-records/teaching-records' },
  { icon: '服', title: '服务记录', subtitle: '请定期提交你的服务推广活动记录', url: '/packageTeacher/service-records/service-records' },
  { icon: '年', title: '年审信息', subtitle: '查看年审进度及提交申请', url: '/packageTeacher/review-records/review-records' },
  { icon: '设', title: '个人设置', subtitle: '更新头像、密码及对外显示信息', url: '/packageTeacher/settings/settings' },
  { icon: '询', title: '咨询服务', subtitle: '查询师资管理小助手信息', url: '', action: 'consultation' },
];

const GUEST_PRIMARY_ACTION = {
  eyebrow: '教师服务',
  title: '关联教师身份',
  detail: '登录后查看你的认证资料与年度记录',
  actionText: '去登录',
  url: '/packageTeacher/login/login?returnUrl=%2FpackageTeacher%2Fprofile%2Fprofile',
  action: 'login',
};

Page({
  data: {
    statusBarHeight: 20,
    isTeacher: false,
    isGuest: false,
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
    avatarUploading: false,
    canSubmitReview: false,
    reviewBlockedReason: '',
    menuItems: [],
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    if (!auth.isLoggedIn()) {
      this.setData({
        isGuest: true,
        primaryAction: GUEST_PRIMARY_ACTION,
        menuItems: teacherMenuItems(null),
      });
      return;
    }
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
        },
        primaryAction: {
          eyebrow: '认证状态',
          title: '电子认证证书',
          detail: `有效至 ${t.validUntil || '--'}`,
          actionText: '查看证书',
          url: '/packageTeacher/cert-view/cert-view',
        },
        menuItems: teacherMenuItems(t.id),
      });
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
    if (this.data.isGuest) {
      if (action === 'login' && url) {
        wx.navigateTo({ url });
        return;
      }
      wx.showToast({ title: '登录后可查看教师服务', icon: 'none' });
      return;
    }
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

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/pages/index/index' });
  },
});
