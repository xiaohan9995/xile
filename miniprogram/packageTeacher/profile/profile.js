const { request } = require('../../utils/request');
const auth = require('../../utils/auth');
const { normalizeMultiline } = require('../../utils/text');

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

// The 讲师服务 list is identical for guests and logged-in teachers so the
// 我的认证 page looks the same in both states. Only 关联教师身份 is reachable
// for a guest — every other entry is a second-level page and gets intercepted.
// 咨询服务 is rendered separately in the wxml as an open-type="contact" button.
const teacherMenuItems = (teacherId) => [
  { icon: '我', title: '我的信息', subtitle: '查看对外公开显示的师资页面', url: `/pages/teacher-detail/teacher-detail?id=${teacherId || ''}` },
  { icon: '教', title: '教学记录', subtitle: '请定期提交你的教学传播活动记录', url: '/packageTeacher/teaching-records/teaching-records' },
  { icon: '服', title: '服务记录', subtitle: '请定期提交你的服务推广活动记录', url: '/packageTeacher/service-records/service-records' },
  { icon: '年', title: '年审信息', subtitle: '查看年审进度及提交申请', url: '/packageTeacher/review-records/review-records' },
  { icon: '设', title: '个人设置', subtitle: '更新头像、密码及对外显示信息', url: '/packageTeacher/settings/settings' },
];

// 关联教师身份 stays open to guests; it is the only second-level entry a
// guest may enter, so it keeps its normal arrow instead of the lock hint.
// (个人设置 is intentionally NOT open to guests — only teachers may enter it.)
const GUEST_OPEN_URLS = [
  '/packageTeacher/link-teacher/link-teacher',
];

// Guests render the exact same 讲师服务 entries as a logged-in teacher. The
// list comes from one source so nothing leaks, and each entry is intercepted
// in onMenuTap before navigation.
const GUEST_MENU_ITEMS = teacherMenuItems(null).map((item) => ({
  ...item,
  locked: GUEST_OPEN_URLS.indexOf(item.url) === -1,
}));

// A logged-in user who has not linked a teacher record yet (the certification
// endpoint answers 403 "not a teacher") sees the same full list as a teacher.
// Only 关联教师身份 is reachable, so the entries are marked locked the same way.
const UNLINKED_MENU_ITEMS = GUEST_MENU_ITEMS;

Page({
  data: {
    statusBarHeight: 20,
    isTeacher: false,
    isGuest: false,
    isLoggedIn: false,
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
    this.refresh();
  },

  onShow() {
    // Re-evaluate on every show: logging in or out from 个人设置 must flip the
    // page between the guest and teacher states without a manual reload.
    this.refresh();
  },

  refresh() {
    this.setData({
      'user.avatarUrl': displayAvatarUrl(auth.getAvatarUrl()),
      'user.nickname': auth.getNickname(),
    });
    if (!auth.isLoggedIn()) {
      this.setData({
        isTeacher: false,
        isGuest: true,
        isLoggedIn: false,
        teacher: {
          name: '',
          xileName: '',
          tier: '',
          tierName: '',
          avatarUrl: '',
          bio: '',
          validUntil: '--',
          daysLeft: 0,
        },
        primaryAction: {},
        menuItems: GUEST_MENU_ITEMS,
      });
      return;
    }
    this.setData({ isGuest: false, isLoggedIn: true });
    this.loadProfile();
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
          // 简介是多行文本，统一换行格式后再展示，避免身份卡里出现多余空行。
          bio: normalizeMultiline(t.bio),
          validUntil: t.validUntil || '--',
          daysLeft: t.daysLeft || 0,
        },
        primaryAction: {},
        menuItems: teacherMenuItems(t.id),
      });
    } catch (err) {
      // Logged in but no teacher record is linked yet. Keep the 讲师服务 list
      // identical to the teacher/guest view instead of collapsing it to two
      // entries, and reuse the guest interception so only 个人设置 opens.
      this.setData({
        isTeacher: false,
        isGuest: true,
        primaryAction: {
          eyebrow: '教师服务',
          title: '关联教师身份',
          detail: '输入教师身份证号和初始密码',
          actionText: '去关联',
          url: '/packageTeacher/link-teacher/link-teacher',
        },
        menuItems: UNLINKED_MENU_ITEMS,
      });
    }
  },

  onMenuTap(e) {
    const url = e.currentTarget.dataset.url;
    const action = e.currentTarget.dataset.action;
    if (this.data.isGuest) {
      // 关联教师身份 is open to guests; everything else just shows a hint
      // instead of opening a page that would bounce them.
      if (url && GUEST_OPEN_URLS.indexOf(url) !== -1) {
        wx.navigateTo({ url });
        return;
      }
      wx.showToast({ title: '仅对教师开放', icon: 'none' });
      return;
    }
    if (action === 'submit-review' && !this.data.canSubmitReview) {
      const title = this.data.reviewBlockedReason === 'certification-valid'
        ? '当前认证尚未到期'
        : '当前尚未到年审提交时间';
      wx.showToast({ title, icon: 'none' });
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

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新使用微信登录，个人资料和认证记录不会被删除。',
      confirmText: '退出',
      confirmColor: '#2f5140',
      cancelText: '取消',
      success: (result) => {
        if (!result.confirm) return;
        auth.logout();
        wx.reLaunch({ url: '/pages/index/index' });
      },
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
