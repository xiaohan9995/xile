const auth = require('../../utils/auth');

Page({
  data: { username: '', password: '', loading: false, returnUrl: '/packageTeacher/home/home' },
  onLoad(options) { this.setData({ returnUrl: decodeURIComponent(options.returnUrl || '/packageTeacher/home/home') }); },
  input(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  async submit() {
    const { username, password, returnUrl } = this.data;
    if (!username.trim() || !password) { wx.showToast({ title: '请输入账号和密码', icon: 'none' }); return; }
    this.setData({ loading: true });
    try {
      const data = await auth.loginWithPassword(username.trim(), password);
      if (data.mustChangePassword) {
        wx.showToast({ title: '请尽快在设置中修改初始密码', icon: 'none' });
      }
      wx.reLaunch({ url: returnUrl });
    } catch (e) {
      wx.showToast({ title: e && e.message ? e.message : '账号或密码错误', icon: 'none' });
    } finally { this.setData({ loading: false }); }
  },
  goBack() { wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/index/index' }) }); },
});
