const { request, uploadFile } = require('../../utils/request');
const auth = require('../../utils/auth');

const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    avatarUrl: '',
    nickname: '',
    phone: '',
    loading: false,
    currentPassword: '',
    newPassword: '',
    changingPassword: false,
  },

  onLoad() {
    if (!auth.requireAuth('/packageTeacher/settings/settings')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadUserInfo();
  },

  async loadUserInfo() {
    try {
      const data = await request({ url: '/api/mp/auth/me' });
      this.setData({
        avatarUrl: data.avatarUrl || auth.getAvatarUrl() || '',
        nickname: data.nickname || auth.getNickname() || '',
        phone: data.phone || '',
      });
    } catch (err) {
      this.setData({
        avatarUrl: auth.getAvatarUrl() || '',
        nickname: auth.getNickname() || '',
      });
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;
    this.setData({ loading: true });
    uploadFile({
      url: '/api/mp/auth/update-profile',
      filePath: avatarUrl,
      name: 'avatar',
      formData: { nickname: this.data.nickname || '' },
    })
      .then((res) => {
        this.setData({ avatarUrl: res.avatarUrl || avatarUrl });
        auth.setAvatarUrl(res.avatarUrl);
        wx.showToast({ title: '头像已更新', icon: 'success' });
      })
      .catch(() => {
        wx.showToast({ title: '上传失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value || '' });
  },

  onPasswordInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value || '' });
  },

  async changePassword() {
    if ((this.data.newPassword || '').length < 8) {
      wx.showToast({ title: '新密码至少 8 位', icon: 'none' });
      return;
    }
    this.setData({ changingPassword: true });
    try {
      await request({ url: '/api/mp/auth/change-password', method: 'POST', data: {
        currentPassword: this.data.currentPassword,
        newPassword: this.data.newPassword,
      } });
      this.setData({ currentPassword: '', newPassword: '' });
      wx.showToast({ title: '密码已更新', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '密码更新失败', icon: 'none' });
    } finally {
      this.setData({ changingPassword: false });
    }
  },

  onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '已取消', icon: 'none' });
      return;
    }
    const code = e.detail.code;
    this.setData({ loading: true });
    request({
      url: '/api/mp/auth/bind-phone',
      method: 'POST',
      data: { code },
    })
      .then((res) => {
        this.setData({ phone: res.phone });
        auth.setPhoneBound(true);
        auth.setTeacherIdentity(res.teacherId, res.role);
        wx.showToast({ title: '手机号已更新', icon: 'success' });
      })
      .catch(() => {
        wx.showToast({ title: '更换失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
  },

  async onSave() {
    const nickname = (this.data.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await request({
        url: '/api/mp/auth/update-profile',
        method: 'POST',
        data: { nickname },
      });
      auth.setNickname(res.nickname || nickname);
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
