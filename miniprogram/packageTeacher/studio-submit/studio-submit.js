const { request, uploadFile } = require('../../utils/request');
const auth = require('../../utils/auth');
const { normalizeMultiline } = require('../../utils/text');
const app = getApp();

// 后端下发的图片可能是 API 相对路径（"/uploads/..."），<image> 无法解析，
// 需要补上 API 域名；已是完整 http(s) 地址则直接使用。
const displayFileUrl = (url) => {
  if (!url) return '';
  const baseUrl = (app && app.globalData && app.globalData.apiBaseUrl) || '';
  if (/^https?:\/\//i.test(url)) return url;
  return baseUrl ? `${baseUrl}${url}` : url;
};

const STATUS_LABEL = {
  open: '已公开',
  pending: '待审批',
  incomplete: '未提交',
};

// wx.chooseLocation 只返回 POI 名称与完整地址，城市/地区需要从地址文本里解析。
// 关键点：微信返回的完整地址是「连写」的，形如
//   「广东省深圳市南山区科技园南路1号」/「北京市朝阳区建国路87号」
// 省/市/区之间没有分隔符，因此不能按空格切分（旧实现按空格切分后整串只落进
// 一段，导致 city/district 永远解析为空）。这里改用「按行政区划后缀切段」。
const MUNICIPALITIES = ['北京', '上海', '天津', '重庆'];
// 省级：省 / 自治区 / 特别行政区（如 广东省、内蒙古自治区、香港特别行政区）
const PROVINCE_PATTERN = /^(.+?(?:省|自治区|特别行政区))/;
// 市级：市 / 自治州 / 地区 / 盟（如 深圳市、湘西土家族苗族自治州、阿里地区）
const CITY_PATTERN = /^(.+?(?:市|自治州|地区|盟))/;
// 区县级：区 / 县 / 市 / 旗（如 南山区、桐庐县、义乌市、阿荣旗）
const DISTRICT_PATTERN = /^(.+?(?:区|县|市|旗))/;

const parseRegion = (res) => {
  const source = String((res && (res.address || res.name)) || '').trim();
  if (!source) return { city: '', district: '' };

  // 去掉省/市之间的空白与逗号，让「广东省 深圳市」与「广东省深圳市」等价。
  let rest = source.replace(/[\s,，]+/g, '');

  // 直辖市（北京市朝阳区…）：第一段本身就是城市，且没有省级前缀。
  const municipality = MUNICIPALITIES.find((name) => rest.indexOf(name) === 0);
  if (municipality) {
    const matched = rest.match(CITY_PATTERN);
    const city = matched ? matched[1] : municipality;
    rest = rest.slice(city.length);
    const districtMatched = rest.match(DISTRICT_PATTERN);
    return { city, district: districtMatched ? districtMatched[1] : '' };
  }

  // 先剥掉省级前缀，再依次取市、区县；缺失的层级留空，由调用方保留原值。
  const provinceMatched = rest.match(PROVINCE_PATTERN);
  if (provinceMatched) rest = rest.slice(provinceMatched[1].length);

  const cityMatched = rest.match(CITY_PATTERN);
  const city = cityMatched ? cityMatched[1] : '';
  if (cityMatched) rest = rest.slice(city.length);

  const districtMatched = rest.match(DISTRICT_PATTERN);
  return { city, district: districtMatched ? districtMatched[1] : '' };
};

Page({
  data: {
    statusBarHeight: 20,
    loading: false,
    saving: false,
    studios: [],
    editing: null, // the studio currently being edited
    editingId: '',
    // form holds the editable display fields (mirrors backend `fields`)
    form: {
      city: '', district: '', address: '', contact: '', contactImage: '', tags: [], courseIntro: '', images: [], latitude: null, longitude: null,
    },
    tagInput: '',
    maxTags: 8,
    maxImages: 9,
    uploading: false,
    directEdit: false, // 从详情页「修改」按钮直接进入编辑模式
  },

  onLoad(options) {
    if (!auth.requireAuth('/packageTeacher/studio-submit/studio-submit')) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    // 直接以编辑模式进入（从工作室详情页「修改」按钮跳转）
    if (options && options.id) {
      this.setData({ editingId: String(options.id), directEdit: true });
      this.loadStudioForEdit(String(options.id));
      return;
    }
    this.loadStudios();
  },

  onShow() {
    if (!auth.isLoggedIn() || !auth.isTeacher()) {
      auth.requireAuth('/packageTeacher/studio-submit/studio-submit');
      return;
    }
    // 直接编辑模式下不重复加载列表
    if (this.data.editingId && !this.data.editing) return;
    this.loadStudios();
  },

  async loadStudios() {
    this.setData({ loading: true });
    try {
      const data = await request({ url: '/api/mp/teachers/me/studios' });
      this.setData({ studios: data.items || [] });
    } catch (error) {
      wx.showToast({ title: error.message || '工作室信息加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadStudioForEdit(id) {
    this.setData({ loading: true });
    try {
      const data = await request({ url: '/api/mp/teachers/me/studios' });
      const studio = (data.items || []).find((item) => String(item.id) === String(id));
      if (!studio) {
        wx.showToast({ title: '未找到该工作室', icon: 'none' });
        return;
      }
      this.fillEditor(studio);
    } catch (error) {
      wx.showToast({ title: error.message || '工作室信息加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  fillEditor(studio) {
    const f = studio.fields || {};
    this.setData({
      editing: studio,
      editingId: String(studio.id),
      form: {
        city: f.city || '',
        district: f.district || '',
        address: f.address || '',
        contact: f.contact || '',
        contactImage: displayFileUrl(f.contactImage),
        tags: f.tags || [],
        // 课程介绍是多行文本，回填时统一换行格式，避免历史数据里的连续空行在
        // 编辑框里继续累积。
        courseIntro: normalizeMultiline(f.courseIntro),
        images: (f.images || []).map(displayFileUrl),
        latitude: f.latitude != null ? f.latitude : null,
        longitude: f.longitude != null ? f.longitude : null,
      },
    });
  },

  statusLabel(status) {
    return STATUS_LABEL[status] || status;
  },

  input(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
  },

  addTag() {
    const tag = (this.data.tagInput || '').trim();
    if (!tag) return;
    if (tag.length > 6) { wx.showToast({ title: '每个标签最多 6 个字', icon: 'none' }); return; }
    const tags = this.data.form.tags;
    if (tags.length >= this.data.maxTags) { wx.showToast({ title: `标签最多 ${this.data.maxTags} 个`, icon: 'none' }); return; }
    if (tags.indexOf(tag) !== -1) { wx.showToast({ title: '标签已存在', icon: 'none' }); return; }
    this.setData({ 'form.tags': [...tags, tag], tagInput: '' });
  },

  removeTag(e) {
    const index = Number(e.currentTarget.dataset.index);
    const tags = this.data.form.tags.slice();
    tags.splice(index, 1);
    this.setData({ 'form.tags': tags });
  },

  chooseImages() {
    const remaining = this.data.maxImages - this.data.form.images.length;
    if (remaining <= 0) { wx.showToast({ title: `图片最多 ${this.data.maxImages} 张`, icon: 'none' }); return; }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const files = res.tempFiles || [];
        for (const file of files) {
          if (file.size > 10 * 1024 * 1024) { wx.showToast({ title: '图片不能超过10MB', icon: 'none' }); continue; }
          const path = file.tempFilePath;
          const matched = path.match(/[\w-]+\.(jpg|jpeg|png|gif|webp)$/i);
          const filename = matched ? matched[0] : 'studio.jpg';
          try {
            wx.showLoading({ title: '上传图片中' });
            const result = await uploadFile({ url: '/api/mp/upload/evidence', filePath: path, name: 'file', formData: { filename } });
            this.setData({ 'form.images': [...this.data.form.images, displayFileUrl(result.url)] });
          } catch (error) {
            wx.showToast({ title: error.message || '图片上传失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      },
    });
  },

  removeImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const images = this.data.form.images.slice();
    images.splice(index, 1);
    this.setData({ 'form.images': images });
  },

  // 联系工作室图片：单张，含电话/二维码等联系方式，详情页点选后预览。
  chooseContactImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { wx.showToast({ title: '图片不能超过10MB', icon: 'none' }); return; }
        const path = file.tempFilePath;
        const matched = path.match(/[\w-]+\.(jpg|jpeg|png|gif|webp)$/i);
        const filename = matched ? matched[0] : 'studio-contact.jpg';
        try {
          wx.showLoading({ title: '上传图片中' });
          const result = await uploadFile({ url: '/api/mp/upload/evidence', filePath: path, name: 'file', formData: { filename } });
          this.setData({ 'form.contactImage': displayFileUrl(result.url) });
        } catch (error) {
          wx.showToast({ title: error.message || '图片上传失败', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  removeContactImage() {
    this.setData({ 'form.contactImage': '' });
  },

  previewContactImage() {
    const url = this.data.form.contactImage;
    if (!url) return;
    wx.previewImage({ urls: [url], current: url });
  },

  // 点击工作室卡片跳转到工作室详情页（统一公开展示入口，修改操作在详情页内）
  openStudioDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/studio-detail/studio-detail?id=${id}` });
  },

  // 管理教师：仅在当前用户是工作室管理员（manager）时展示入口，跳转到
  // 独立的教师管理页，页面内部会再次校验权限。
  goManageTeachers() {
    const id = this.data.editing && this.data.editing.id;
    if (!id) return;
    wx.navigateTo({ url: `/packageTeacher/studio-teachers/studio-teachers?id=${id}` });
  },

  closeEditor() {
    this.setData({ editing: null, editingId: '', form: { city: '', district: '', address: '', contact: '', contactImage: '', tags: [], courseIntro: '', images: [], latitude: null, longitude: null } });
  },

  // 用微信内置地图选点，让地图标记与详细地址保持一致。
  chooseLocation() {
    wx.chooseLocation({
      latitude: this.data.form.latitude || undefined,
      longitude: this.data.form.longitude || undefined,
      success: (res) => {
        // 选点后同步经纬度与地址：优先用 POI 名称（更贴合展示习惯），
        // 名称缺失时退回完整地址，两者都为空才保留原值。
        const picked = (res.name || '').trim() || (res.address || '').trim();
        // 城市/地区由选点结果自动填充，与地址保持同一份数据来源。
        const region = parseRegion(res);
        this.setData({
          'form.latitude': res.latitude,
          'form.longitude': res.longitude,
          'form.address': picked || this.data.form.address,
          'form.city': region.city || this.data.form.city,
          'form.district': region.district || this.data.form.district,
        });
        wx.showToast({ title: '已更新地图位置', icon: 'none' });
      },
      fail: () => {
        // 用户主动取消无需提示。
      },
    });
  },

  async submit() {
    const { form, editingId } = this.data;
    if (!form.address.trim()) {
      wx.showToast({ title: '请填写地址', icon: 'none' });
      return;
    }
    // 提交前规范化课程介绍的换行：连续空行压缩为段落分隔，避免把「多敲的回车」
    // 存进后端，导致详情页出现大段空白。
    const courseIntro = normalizeMultiline(form.courseIntro);
    const data = {
      address: form.address,
      contact: form.contact,
      contactImage: form.contactImage,
      tags: form.tags.join(','),
      courseIntro,
      images: form.images,
    };
    // 城市/地区随地址一起提交，与地图选点结果保持一致。
    if (form.city) data.city = form.city;
    if (form.district) data.district = form.district;
    if (form.latitude != null && form.longitude != null) {
      data.latitude = form.latitude;
      data.longitude = form.longitude;
    }
    this.setData({ saving: true });
    try {
      await request({ url: `/api/mp/teachers/me/studios/${editingId}`, method: 'PUT', data });
      wx.showToast({ title: '已提交，等待管理员审批', icon: 'none' });
      if (this.data.directEdit) {
        // 直接编辑模式下提交后返回工作室详情页
        setTimeout(() => wx.navigateBack(), 600);
        return;
      }
      this.closeEditor();
      await this.loadStudios();
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
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
