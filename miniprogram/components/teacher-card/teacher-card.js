const app = getApp();

// 后端下发的头像可能是 API 相对路径（"/uploads/avatars/..."），<image> 无法解析，
// 需要补上 API 域名；微信头像（qlogo.cn）走后端代理，避免小程序域名白名单问题。
const displayAvatarUrl = (url) => {
  if (!url) return '';
  const baseUrl = (app && app.globalData && app.globalData.apiBaseUrl) || '';
  if (/^https:\/\/(?:thirdwx|wx)\.qlogo\.cn\//i.test(url)) {
    return baseUrl ? `${baseUrl}/api/mp/auth/avatar-proxy?url=${encodeURIComponent(url)}` : url;
  }
  if (/^https?:\/\//i.test(url)) return url;
  return baseUrl ? `${baseUrl}${url}` : url;
};

Component({
  properties: {
    teacher: {
      type: Object,
      value: {},
    },
  },

  data: {
    displayName: '—',
    realName: '',
    location: '',
  },

  observers: {
    'teacher': function (teacher) {
      if (!teacher) return;
      const displayName = teacher.xileName || teacher.realName || teacher.name || '';
      // The card title is the public identity (喜乐名/别名); the legal name is
      // shown as a secondary line so the two never get confused.
      const realName = teacher.realName || '';
      const showRealName = realName && realName !== displayName ? realName : '';
      const location = [teacher.city, teacher.district].filter(Boolean).join(' · ');
      const avatarUrl = displayAvatarUrl(teacher.avatarUrl);
      this.setData({ displayName: displayName || '—', realName: showRealName, location });
      if (avatarUrl !== teacher.avatarUrl) {
        this.setData({ teacher: { ...teacher, avatarUrl } });
      }
    },
  },

  methods: {
    onTap() {
      const { id } = this.data.teacher;
      if (id) {
        wx.navigateTo({
          url: `/pages/teacher-detail/teacher-detail?id=${id}`,
        });
      }
      this.triggerEvent('tap', { teacher: this.data.teacher });
    },
  },
});
