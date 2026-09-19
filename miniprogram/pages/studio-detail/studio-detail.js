const { request } = require('../../utils/request');
const auth = require('../../utils/auth');
const { normalizeMultiline } = require('../../utils/text');

const app = getApp();

// Dates arrive as "YYYY.MM.DD"; only the year is shown for certification years.
const yearOf = (value) => (value ? String(value).slice(0, 4) : '');

// 后端下发的头像/证书可能是 API 相对路径（"/uploads/..."），<image> 无法解析，
// 需要补上 API 域名；微信头像（qlogo.cn）走后端代理，避免小程序域名白名单问题。
const displayFileUrl = (url) => {
  if (!url) return '';
  const baseUrl = (app && app.globalData && app.globalData.apiBaseUrl) || '';
  if (/^https:\/\/(?:thirdwx|wx)\.qlogo\.cn\//i.test(url)) {
    return baseUrl ? `${baseUrl}/api/mp/auth/avatar-proxy?url=${encodeURIComponent(url)}` : url;
  }
  if (/^https?:\/\//i.test(url)) return url;
  return baseUrl ? `${baseUrl}${url}` : url;
};

// 课程介绍在后端是单个文本字段（studios.course_intro，≤500 字，管理员与主理教师
// 都按整段文本维护）。详情页要按「名称 / 简介 / 授课教师 / 适合人群 / 学习目标」
// 五要素逐门展示，因此这里把整段文本解析成结构化课程。
//
// 约定格式（字段名后接中英文冒号，每门课程以「课程」或「课程N」开头）：
//   课程1：哈他瑜伽入门
//   简介：从呼吸与体式基础开始……
//   授课教师：善悦
//   适合人群：零基础学员、久坐上班族
//   学习目标：掌握基础体式；建立稳定呼吸节奏
//
// 兼容性：文本不符合上述格式时，整段作为「课程介绍」单门课程展示，保证任何
// 存量数据都能正常渲染，不会出现空白抽屉。
const COURSE_FIELD_ALIASES = {
  name: ['课程名称', '课程', '名称'],
  intro: ['课程简介', '简介', '课程介绍', '介绍'],
  teachers: ['授课教师', '主讲教师', '任课教师', '教师'],
  audience: ['适合人群', '适用人群', '适合对象', '人群'],
  goals: ['学习目标', '课程目标', '教学目标', '目标'],
};

// 字段值内部的分隔符：中英文顿号/逗号/分号/换行都视为多值。
const splitValues = (value) =>
  String(value || '')
    .split(/[、,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const COURSE_HEADING = /^课程\s*\d*\s*[：:]\s*(.*)$/;

const matchFieldKey = (label) => {
  const normalized = String(label || '').trim();
  if (!normalized) return '';
  return Object.keys(COURSE_FIELD_ALIASES).find((key) =>
    COURSE_FIELD_ALIASES[key].includes(normalized)
  ) || '';
};

const parseCourseIntro = (text) => {
  // 先规范化换行：连续空行压缩为段落分隔，行首尾空白去掉，避免解析出空行或
  // 把「多敲的回车」当成新的课程/字段。
  const raw = normalizeMultiline(text);
  if (!raw) return [];

  const courses = [];
  let current = null;
  let currentField = '';

  const pushCurrent = () => {
    if (current && (current.name || current.intro || current.teachers.length || current.audience.length || current.goals.length)) {
      courses.push(current);
    }
  };

  const ensureCourse = () => {
    if (!current) current = { name: '', intro: '', teachers: [], audience: [], goals: [] };
    return current;
  };

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const heading = trimmed.match(COURSE_HEADING);
    if (heading) {
      pushCurrent();
      current = { name: heading[1].trim(), intro: '', teachers: [], audience: [], goals: [] };
      currentField = '';
      return;
    }

    const separatorIndex = trimmed.search(/[：:]/);
    if (separatorIndex > 0) {
      const key = matchFieldKey(trimmed.slice(0, separatorIndex));
      if (key) {
        const value = trimmed.slice(separatorIndex + 1).trim();
        const course = ensureCourse();
        if (key === 'name') {
          course.name = value;
        } else if (key === 'intro') {
          course.intro = value;
        } else {
          course[key] = splitValues(value);
        }
        currentField = key;
        return;
      }
    }

    // 无字段前缀的续行：并入上一个字段，支持长简介/多目标换行书写。
    const course = ensureCourse();
    if (currentField === 'intro') {
      course.intro = course.intro ? `${course.intro}\n${trimmed}` : trimmed;
    } else if (currentField && Array.isArray(course[currentField])) {
      course[currentField] = course[currentField].concat(splitValues(trimmed));
    } else if (!course.intro) {
      course.intro = trimmed;
    } else {
      course.intro = `${course.intro}\n${trimmed}`;
    }
  });
  pushCurrent();

  if (!courses.length) {
    return [{ key: 'course-0', name: '课程介绍', intro: raw, teachers: [], audience: [], goals: [] }];
  }
  return courses.map((course, index) => ({
    ...course,
    key: `course-${index}`,
    name: course.name || `课程${index + 1}`,
  }));
};

// 把课程里写到的教师名匹配到工作室主理教师，让「授课教师」可以直接点开教师详情。
const attachCourseTeachers = (courses, ownerTeachers) => {
  const pool = (ownerTeachers || []).map((teacher) => ({
    id: teacher.id,
    name: teacher.name || teacher.xileName || teacher.realName || '',
    aliases: [teacher.name, teacher.xileName, teacher.realName].filter(Boolean).map(String),
    avatarUrl: teacher.avatarUrl || '',
    initial: (teacher.name || teacher.xileName || teacher.realName || '教').charAt(0),
  }));

  return courses.map((course) => {
    const matched = [];
    (course.teachers || []).forEach((rawName) => {
      const name = String(rawName).trim();
      if (!name) return;
      const teacher = pool.find((candidate) =>
        candidate.aliases.some((alias) => alias === name || alias.indexOf(name) !== -1 || name.indexOf(alias) !== -1)
      );
      if (teacher) {
        if (!matched.some((item) => item.id === teacher.id)) matched.push(teacher);
        return;
      }
      // 未匹配到主理教师时保留纯文本，避免信息丢失。
      matched.push({ id: `text-${name}`, name, avatarUrl: '', initial: name.charAt(0) });
    });
    return { ...course, teachers: matched };
  });
};

Page({
  data: {
    statusBarHeight: 20,
    studio: null,
    loading: false,
    error: '',
    mine: null, // { status, rejectReason } when the viewer is a lead teacher
    courses: [],
    courseDrawerVisible: false,
    teacherDrawerVisible: false,
    selectedTeacher: null,
    teacherLoading: false,
    teacherBioExpanded: false,
  },

  onLoad(options) {
    if (!auth.requireLogin(`/pages/studio-detail/studio-detail?id=${options.id || ''}`)) return;
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    if (options.id) {
      this.loadStudio(options.id);
    }
  },

  onShow() {
    // Re-check ownership in case the teacher submitted/withdrew and came back.
    if (this.data.studio && this.data.studio.id) {
      this.loadStudio(this.data.studio.id);
    }
  },

  async loadStudio(id) {
    this.setData({ loading: true, error: '' });
    try {
      const studio = await request({ url: `/api/mp/studios/${id}` });
      const images = Array.isArray(studio.images) && studio.images.length
        ? studio.images
        : (studio.coverUrl ? [studio.coverUrl] : []);
      const ownerTeachers = (Array.isArray(studio.ownerTeachers) && studio.ownerTeachers.length)
        ? studio.ownerTeachers
        : (studio.ownerTeacherName ? [{ name: studio.ownerTeacherName, realName: studio.ownerTeacherRealName || '' }] : []);
      ownerTeachers.forEach((teacher) => {
        teacher.avatarUrl = displayFileUrl(teacher.avatarUrl);
      });
      // 课程介绍是多行文本（教师/管理员在 textarea 里自由输入），统一换行格式后
      // 再解析，保证抽屉里的段落间距一致、不出现多余空行。
      const courseIntro = normalizeMultiline(studio.courseIntro);
      this.setData({
        studio: {
          ...studio,
          id,
          images,
          coverImage: images[0],
          ownerTeachers,
          courseIntro,
          contactText: studio.contactText || '',
          // 联系工作室图片：主理教师上传的一张图（含电话、二维码等），点选后预览。
          contactImage: displayFileUrl(studio.contactImage) || '',
          tags: studio.tags || [],
          status: studio.status || '开放中',
        },
        courses: attachCourseTeachers(parseCourseIntro(courseIntro), ownerTeachers),
        mine: studio.mine || null,
      });
    } catch (err) {
      this.setData({ error: '工作室详情暂时无法加载' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goEdit() {
    const id = this.data.studio && this.data.studio.id;
    if (!id) return;
    wx.navigateTo({ url: `/packageTeacher/studio-submit/studio-submit?id=${id}` });
  },

  withdraw() {
    const id = this.data.studio && this.data.studio.id;
    if (!id) return;
    wx.showModal({
      title: '撤回提交',
      content: '撤回后该次提交将不再等待审批，你已填写的内容会保留，可修改后重新提交。',
      confirmText: '撤回',
      confirmColor: '#2f5140',
      cancelText: '取消',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await request({ url: `/api/mp/teachers/me/studios/${id}/withdraw`, method: 'POST' });
          wx.showToast({ title: '已撤回', icon: 'none' });
          this.loadStudio(id);
        } catch (error) {
          wx.showToast({ title: error.message || '撤回失败，请稍后重试', icon: 'none' });
        }
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },

  openCourseDrawer() {
    // 即使未配置课程介绍也允许打开，抽屉内会给出空态指引。
    if (!this.data.studio) return;
    this.setData({ courseDrawerVisible: true });
  },

  closeCourseDrawer() {
    this.setData({ courseDrawerVisible: false });
  },

  openTeacherDrawer(e) {
    const id = e.currentTarget.dataset.id;
    const teacher = (this.data.studio.ownerTeachers || []).find((t) => String(t.id) === String(id));
    if (!teacher) return;
    // 每次打开都从折叠态开始，避免沿用上一位教师的展开状态。
    this.setData({
      teacherDrawerVisible: true,
      selectedTeacher: teacher,
      teacherLoading: true,
      teacherBioExpanded: false,
    });
    this.loadTeacherDetail(id);
  },

  // 个人简介展开/收起：与教师详情页 bio-card 的交互一致。
  toggleTeacherBio() {
    this.setData({ teacherBioExpanded: !this.data.teacherBioExpanded });
  },

  async loadTeacherDetail(id) {
    try {
      const teacher = await request({ url: `/api/mp/teachers/${id}/summary` });
      teacher.avatarUrl = displayFileUrl(teacher.avatarUrl);
      teacher.certificateUrl = displayFileUrl(teacher.certificateUrl);
      const displayName = teacher.xileName || teacher.realName || teacher.name || '';
      this.setData({
        selectedTeacher: {
          ...teacher,
          teacherInitial: displayName ? displayName.charAt(0) : '?',
          commonName: teacher.alias || teacher.realName || '',
          firstCertifiedYear: yearOf(teacher.certifiedAt),
          currentTierCertifiedYear: yearOf(teacher.currentTierCertifiedOn),
          residencesText: (teacher.residences || []).join('、'),
          specialtiesText: (teacher.specialties || []).join('、'),
          // 个人简介是多行文本，统一换行展示，避免多余空行撑开抽屉。
          teachingSummary: normalizeMultiline(teacher.teachingSummary),
        },
      });
    } catch (err) {
      // 详情拉取失败时保留列表里已有的基本信息，避免抽屉空白。
      const fallback = (this.data.studio.ownerTeachers || []).find((t) => String(t.id) === String(id));
      if (fallback) this.setData({ selectedTeacher: fallback });
    } finally {
      this.setData({ teacherLoading: false });
    }
  },

  previewTeacherCertificate() {
    const url = this.data.selectedTeacher && this.data.selectedTeacher.certificateUrl;
    if (!url) {
      wx.showToast({ title: '证书图片暂未生成', icon: 'none' });
      return;
    }
    wx.previewImage({ urls: [url], current: url });
  },

  closeTeacherDrawer() {
    this.setData({ teacherDrawerVisible: false, selectedTeacher: null, teacherBioExpanded: false });
  },

  noop() {},

  openMap() {
    const studio = this.data.studio;
    const latitude = Number(studio && studio.latitude);
    const longitude = Number(studio && studio.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      wx.showToast({ title: '该工作室暂未配置地图位置', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude,
      longitude,
      // Map clients prominently display `name`; use the selected street
      // address rather than the studio brand so navigation is unambiguous.
      name: studio.address || studio.name || '工作室地址',
      address: studio.address || studio.name || '',
      scale: 16,
    });
  },

  // 联系工作室：预览主理教师上传的图片（含联系电话、二维码等信息），
  // 不再单独展示电话，也不走小程序客服。
  previewContactImage() {
    const studio = this.data.studio;
    const url = studio && studio.contactImage;
    if (!url) {
      wx.showToast({ title: '该工作室暂未配置联系图片', icon: 'none' });
      return;
    }
    wx.previewImage({ urls: [url], current: url });
  },
});
