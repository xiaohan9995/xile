const { request, uploadFile } = require('../../utils/request');
const auth = require('../../utils/auth');
const app = getApp();

Page({
  data: {
    statusBarHeight: 20, loading: false, records: [], showForm: false, month: '', saving: false,
    form: { taughtOn: '', platform: '', title: '', durationHours: '', participantCount: '', description: '', evidenceKey: '', evidenceName: '' },
  },
  onLoad() {
    if (!auth.requireAuth('/packageTeacher/teaching-records/teaching-records')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight }); this.loadRecords();
  },
  onShow() { if (auth.isLoggedIn()) this.loadRecords(); },
  async loadRecords() {
    this.setData({ loading: true });
    try { const suffix = this.data.month ? `?month=${this.data.month}` : ''; const data = await request({ url: `/api/mp/teaching-records${suffix}` }); this.setData({ records: data.items || [] }); }
    catch (e) { wx.showToast({ title: e.message || '教学记录加载失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },
  toggleForm() { this.setData({ showForm: !this.data.showForm }); },
  input(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  chooseEvidence() {
    wx.chooseMessageFile({ count: 1, type: 'file', extension: ['jpg', 'jpeg', 'png', 'pdf'], success: async (res) => {
      const file = res.tempFiles && res.tempFiles[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { wx.showToast({ title: '附件不能超过10MB', icon: 'none' }); return; }
      try {
        wx.showLoading({ title: '上传佐证中' });
        const presign = await request({ url: '/api/mp/upload/presign', method: 'POST', data: { filename: file.name } });
        const result = await uploadFile({ url: presign.uploadUrl, filePath: file.path, name: 'file' });
        this.setData({ 'form.evidenceKey': result.fileKey || presign.fileKey, 'form.evidenceName': file.name });
      } catch (e) { wx.showToast({ title: e.message || '佐证上传失败', icon: 'none' }); }
      finally { wx.hideLoading(); }
    }});
  },
  chooseMonth(e) { this.setData({ month: e.detail.value }); this.loadRecords(); },
  async submit(status = 'submitted') {
    const form = this.data.form;
    if (!form.taughtOn || !form.platform.trim() || !form.title.trim()) { wx.showToast({ title: '请填写日期、平台和活动名称', icon: 'none' }); return; }
    try {
      this.setData({ saving: true });
      await request({ url: '/api/mp/teaching-records', method: 'POST', data: { ...form, status, durationHours: form.durationHours || null, participantCount: form.participantCount || null } });
      this.setData({ showForm: false, form: { taughtOn: '', platform: '', title: '', durationHours: '', participantCount: '', description: '', evidenceKey: '', evidenceName: '' } });
      await this.loadRecords(); wx.showToast({ title: status === 'draft' ? '草稿已保存' : '教学记录已提交', icon: 'success' });
    } catch (e) { wx.showToast({ title: e.message || '提交失败，请稍后重试', icon: 'none' }); }
    finally { this.setData({ saving: false }); }
  },
  saveDraft() { this.submit('draft'); },
  goBack() { wx.navigateBack(); },
});
