const { request, uploadFile } = require('../../utils/request');
const auth = require('../../utils/auth');
const app = getApp();

Page({
  data: {
    statusBarHeight: 20, loading: false, records: [], showForm: false, month: '', saving: false, editingId: '',
    form: { taughtOn: '', platform: '', title: '', durationHours: '', participantCount: '', description: '', evidenceKey: '', evidenceName: '' },
  },
  onLoad() {
    if (!auth.requireAuth('/packageTeacher/teaching-records/teaching-records')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight }); this.loadRecords();
  },
  onShow() {
    // Guard re-entry so a guest cannot keep teacher records on screen.
    if (!auth.isLoggedIn() || !auth.isTeacher()) {
      auth.requireAuth('/packageTeacher/teaching-records/teaching-records');
      return;
    }
    this.loadRecords();
  },
  async loadRecords() {
    this.setData({ loading: true });
    try { const suffix = this.data.month ? `?month=${this.data.month}` : ''; const data = await request({ url: `/api/mp/teaching-records${suffix}` }); this.setData({ records: data.items || [] }); }
    catch (e) { wx.showToast({ title: e.message || '教学记录加载失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },
  toggleForm() {
    if (this.data.showForm) { this.setData({ showForm: false, editingId: '' }); }
    else { this.setData({ showForm: true }); }
  },
  input(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  chooseEvidence() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { wx.showToast({ title: '附件不能超过10MB', icon: 'none' }); return; }
        const path = file.tempFilePath;
        const matched = path.match(/[\w-]+\.(jpg|jpeg|png|gif|webp)$/i);
        const filename = matched ? matched[0] : 'evidence.jpg';
        try {
          wx.showLoading({ title: '上传佐证中' });
          const result = await uploadFile({ url: '/api/mp/upload/evidence', filePath: path, name: 'file', formData: { filename } });
          this.setData({ 'form.evidenceKey': result.fileKey, 'form.evidenceName': filename });
        } catch (e) { wx.showToast({ title: e.message || '佐证上传失败', icon: 'none' }); }
        finally { wx.hideLoading(); }
      },
    });
  },
  editRecord(e) {
    const { id, status } = e.currentTarget.dataset;
    if (status !== 'draft') { wx.showToast({ title: '已提交记录不可修改', icon: 'none' }); return; }
    const record = this.data.records.find((item) => String(item.id) === String(id));
    if (!record) return;
    this.setData({
      editingId: id,
      showForm: true,
      form: {
        taughtOn: record.taughtOn || '', platform: record.platform || '', title: record.title || '',
        durationHours: record.durationHours || '', participantCount: record.participantCount || '',
        description: record.description || '', evidenceKey: record.evidenceKey || '', evidenceName: '',
      },
    });
  },
  chooseMonth(e) { this.setData({ month: e.detail.value }); this.loadRecords(); },
  async submit(status = 'submitted') {
    const { form, editingId } = this.data;
    if (!form.taughtOn || !form.platform.trim() || !form.title.trim()) { wx.showToast({ title: '请填写日期、平台和活动名称', icon: 'none' }); return; }
    const data = { ...form, status, durationHours: form.durationHours || null, participantCount: form.participantCount || null };
    try {
      this.setData({ saving: true });
      if (editingId) {
        await request({ url: `/api/mp/teaching-records/${editingId}`, method: 'PUT', data });
      } else {
        await request({ url: '/api/mp/teaching-records', method: 'POST', data });
      }
      this.setData({ showForm: false, editingId: '', form: { taughtOn: '', platform: '', title: '', durationHours: '', participantCount: '', description: '', evidenceKey: '', evidenceName: '' } });
      await this.loadRecords();
      wx.showToast({ title: status === 'draft' ? '草稿已保存' : (editingId ? '草稿已提交' : '教学记录已提交'), icon: 'none' });
    } catch (e) { wx.showToast({ title: e.message || '提交失败，请稍后重试', icon: 'none' }); }
    finally { this.setData({ saving: false }); }
  },
  saveDraft() { this.submit('draft'); },
  submitRecord() { this.submit('submitted'); },
  goBack() { wx.navigateBack(); },
});
