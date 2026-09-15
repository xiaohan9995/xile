const { request, uploadFile } = require('../../utils/request');
const auth = require('../../utils/auth');
const app = getApp();

Page({
  data: {
    statusBarHeight: 20, loading: false, saving: false, records: [], showForm: false, editingId: '',
    types: ['公益服务', '活动推广', '社群服务', '行政支持', '其他'], typeIndex: 0,
    form: { servedOn: '', title: '', location: '', description: '', evidenceKey: '', evidenceName: '' },
  },
  onLoad() {
    if (!auth.requireAuth('/packageTeacher/service-records/service-records')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight }); this.loadRecords();
  },
  onShow() { if (auth.isLoggedIn()) this.loadRecords(); },
  async loadRecords() {
    this.setData({ loading: true });
    try { const data = await request({ url: '/api/mp/service-records' }); this.setData({ records: data.items || [] }); }
    catch (error) { wx.showToast({ title: error.message || '服务记录加载失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },
  toggleForm() {
    if (this.data.showForm) { this.setData({ showForm: false, editingId: '' }); }
    else { this.setData({ showForm: true }); }
  },
  input(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  chooseType(e) { this.setData({ typeIndex: Number(e.detail.value) }); },
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
        } catch (error) { wx.showToast({ title: error.message || '佐证上传失败', icon: 'none' }); }
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
      typeIndex: Math.max(0, this.data.types.indexOf(record.serviceType)),
      showForm: true,
      form: {
        servedOn: record.servedOn || '', title: record.title || '', location: record.location || '',
        description: record.description || '', evidenceKey: record.evidenceKey || '', evidenceName: '',
      },
    });
  },
  async submit(status = 'submitted') {
    const { form, types, typeIndex, editingId } = this.data;
    if (status === 'submitted' && (!form.servedOn || !form.title.trim())) { wx.showToast({ title: '请填写日期和活动名称', icon: 'none' }); return; }
    const data = { ...form, serviceType: types[typeIndex], status };
    this.setData({ saving: true });
    try {
      if (editingId) {
        await request({ url: `/api/mp/service-records/${editingId}`, method: 'PUT', data });
      } else {
        await request({ url: '/api/mp/service-records', method: 'POST', data });
      }
      this.setData({ showForm: false, editingId: '', typeIndex: 0, form: { servedOn: '', title: '', location: '', description: '', evidenceKey: '', evidenceName: '' } });
      await this.loadRecords();
      wx.showToast({ title: status === 'draft' ? '草稿已保存' : (editingId ? '草稿已提交' : '服务记录已提交'), icon: 'none' });
    } catch (error) { wx.showToast({ title: error.message || '提交失败，请稍后重试', icon: 'none' }); }
    finally { this.setData({ saving: false }); }
  },
  saveDraft() { this.submit('draft'); },
  submitRecord() { this.submit('submitted'); },
  goBack() { wx.navigateBack(); },
});
