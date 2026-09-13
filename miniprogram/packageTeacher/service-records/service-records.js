const { request, uploadFile } = require('../../utils/request');
const auth = require('../../utils/auth');
const app = getApp();

Page({
  data: {
    statusBarHeight: 20, loading: false, saving: false, records: [], showForm: false,
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
  toggleForm() { this.setData({ showForm: !this.data.showForm }); },
  input(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  chooseType(e) { this.setData({ typeIndex: Number(e.detail.value) }); },
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
      } catch (error) { wx.showToast({ title: error.message || '佐证上传失败', icon: 'none' }); }
      finally { wx.hideLoading(); }
    }});
  },
  async submit(status = 'submitted') {
    const { form, types, typeIndex } = this.data;
    if (status === 'submitted' && (!form.servedOn || !form.title.trim())) { wx.showToast({ title: '请填写日期和活动名称', icon: 'none' }); return; }
    this.setData({ saving: true });
    try {
      await request({ url: '/api/mp/service-records', method: 'POST', data: { ...form, serviceType: types[typeIndex], status } });
      this.setData({ showForm: false, typeIndex: 0, form: { servedOn: '', title: '', location: '', description: '', evidenceKey: '', evidenceName: '' } });
      await this.loadRecords(); wx.showToast({ title: status === 'draft' ? '草稿已保存' : '服务记录已提交', icon: 'none' });
    } catch (error) { wx.showToast({ title: error.message || '提交失败，请稍后重试', icon: 'none' }); }
    finally { this.setData({ saving: false }); }
  },
  saveDraft() { this.submit('draft'); },
  goBack() { wx.navigateBack(); },
});
