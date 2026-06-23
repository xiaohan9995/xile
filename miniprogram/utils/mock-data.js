const teachers = [
  {
    id: 1,
    teacherNo: 'JY20230001',
    name: '张三',
    xileName: '善悦',
    tier: 'L3',
    tierName: '认证导师',
    city: '上海市',
    district: '徐汇区',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    validUntil: '2028.12.31',
    certificationStatus: '认证有效',
    specialties: ['阴瑜伽', '流瑜伽', '产后瑜伽'],
    teachingSummary: '国家级注册哈他瑜伽导师，十小时工作坊长期主理人。具有深厚的呼吸吐纳哲学功底。',
    certificationNote: '该教师已通过喜乐瑜伽教师认证，资质处于有效期内。',
  },
  {
    id: 2,
    teacherNo: 'JY20230002',
    name: '李四',
    xileName: '清心',
    tier: 'L2',
    tierName: '认证导师',
    city: '北京市',
    district: '朝阳区',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=200&auto=format&fit=crop',
    validUntil: '2026.06.30',
    certificationStatus: '认证有效',
    specialties: ['流瑜伽', '空中瑜伽'],
    teachingSummary: '专注体式流动与呼吸配合，适合初学者建立稳定、轻盈的练习节奏。',
    certificationNote: '该教师已通过喜乐瑜伽教师认证，资质处于有效期内。',
  },
  {
    id: 3,
    teacherNo: 'JY20230003',
    name: '王五',
    xileName: '自在',
    tier: 'L1',
    tierName: '见习导师',
    city: '杭州市',
    district: '西湖区',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    validUntil: '2025.12.31',
    certificationStatus: '即将到期',
    specialties: ['理疗瑜伽', '肩颈舒缓'],
    teachingSummary: '理疗瑜伽导师，擅长通过体式舒缓都市人群的肩颈与脊柱压力。',
    certificationNote: '该教师资质即将到期，请关注年审记录。',
  },
];

const studios = [
  {
    id: 1,
    name: '静心瑜伽空间',
    city: '上海市',
    district: '徐汇区',
    address: '上海市徐汇区复兴中路1199号A栋302室',
    coverUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop',
    intro: '静谧典雅的都市绿洲，配置顶级天然原木地板和全套活性炭空气循环系统。',
    openingHours: '10:00 - 21:00',
    contactText: '021-64332211',
    ownerTeacherName: '张三',
    tags: ['静心冥想', '小班授课', '舒缓拉伸'],
  },
  {
    id: 2,
    name: '清悦身心练习室',
    city: '北京市',
    district: '朝阳区',
    address: '北京市朝阳区建国路88号SOHO现代城5号楼',
    coverUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop',
    intro: '面向初学者和进阶学员的高层练习空间，提供空中瑜伽和呼吸觉察课程。',
    openingHours: '09:30 - 20:30',
    contactText: '010-85889900',
    ownerTeacherName: '李四',
    tags: ['露台瑜伽', '空中瑜伽'],
  },
  {
    id: 3,
    name: '自在瑜伽小院',
    city: '杭州市',
    district: '西湖区',
    address: '杭州市西湖区满觉陇路下满觉陇88号',
    coverUrl: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=80&w=600&auto=format&fit=crop',
    intro: '中式庭院与茶道瑜伽结合的轻疗愈空间，适合周末深度练习。',
    openingHours: '10:00 - 18:00',
    contactText: '0571-88997766',
    ownerTeacherName: '王五',
    tags: ['中式庭院', '茶道瑜伽'],
  },
];

const reviewRecords = [
  {
    id: 1,
    teacherId: 2,
    reviewYear: 2026,
    yearTitle: '2026年度年审',
    status: 'submitted',
    submittedAt: '2026.06.18 10:30',
    reviewedAt: '',
    reviewer: '待审核',
    previousValidUntil: '2026.06.30',
    nextValidUntil: '2028.06.30',
    files: [
      {
        id: 1,
        filename: '继续教育证明.pdf',
        fileKey: 'demo/review/continuing-education.pdf',
        fileType: 'pdf',
        fileSize: 284000,
      },
    ],
  },
  {
    id: 2,
    teacherId: 2,
    reviewYear: 2024,
    yearTitle: '2024年度年审',
    status: 'approved',
    submittedAt: '2024.06.20 09:40',
    reviewedAt: '2024.06.22 14:00',
    reviewer: '教师管理委员会',
    previousValidUntil: '2024.06.30',
    nextValidUntil: '2026.06.30',
    files: [],
  },
];

const normalizePath = (url) => {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
};

const getQuery = (url, key) => {
  const queryIndex = url.indexOf('?');
  if (queryIndex < 0) return '';
  const params = url.slice(queryIndex + 1).split('&');
  const pair = params.find((item) => item.split('=')[0] === key);
  return pair ? decodeURIComponent(pair.split('=').slice(1).join('=')) : '';
};

const mockResponse = (url, options = {}) => {
  const path = normalizePath(url);
  const method = options.method || 'GET';

  // ===== Auth 相关 =====
  if (method === 'POST' && path === '/api/mp/auth/login') {
    return {
      token: 'mock-jwt-token-for-local-dev',
      userId: 1,
      role: 'teacher',
      phoneBound: false,
      teacherId: 2,
    };
  }

  if (method === 'POST' && path === '/api/mp/auth/bind-phone') {
    return { phone: '13800001111' };
  }

  if (path === '/api/mp/stats/overview') {
    return { totalTeachers: 168, totalStudios: 42 };
  }

  if (method === 'POST' && path === '/api/mp/reviews') {
    const data = options.data || {};
    return {
      id: Date.now(),
      teacherId: data.teacherId,
      reviewYear: data.reviewYear,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      files: data.files || [],
    };
  }

  if (path === '/api/mp/teachers/search') {
    const keyword = getQuery(url, 'q').trim();
    const items = keyword
      ? teachers.filter((teacher) => (
        teacher.name.indexOf(keyword) >= 0 ||
        teacher.xileName.indexOf(keyword) >= 0 ||
        teacher.teacherNo.indexOf(keyword) >= 0
      ))
      : teachers;
    return { items, total: items.length, page: 1, pageSize: 20, hasMore: false };
  }

  const teacherMatch = path.match(/^\/api\/mp\/teachers\/(\d+)\/summary$/);
  if (teacherMatch) {
    const teacher = teachers.find((item) => String(item.id) === teacherMatch[1]);
    return teacher || null;
  }

  if (path === '/api/mp/teachers/me/certification') {
    const teacher = teachers[1];
    return {
      teacher: {
        ...teacher,
        daysLeft: 12,
        reviewCycleYears: 2,
        reviewRequired: true,
        firstCertifiedOn: '2024.06.30',
        certificateUrl: '',
        phone: '13800001111',
      },
      reviews: reviewRecords.filter((record) => record.teacherId === teacher.id),
    };
  }

  const certificationMatch = path.match(/^\/api\/mp\/teachers\/(\d+)\/certification$/);
  if (certificationMatch) {
    const teacher = teachers.find((item) => String(item.id) === certificationMatch[1]);
    if (!teacher) return null;
    return {
      teacher: {
        ...teacher,
        validUntil: teacher.validUntil,
        firstCertifiedOn: teacher.id === 2 ? '2024.06.30' : '2023.01.01',
        certificateUrl: '',
        teachingSummary: teacher.teachingSummary,
      },
    };
  }

  if (path === '/api/mp/studios') {
    return { items: studios, total: studios.length, page: 1, pageSize: 20, hasMore: false };
  }

  const studioMatch = path.match(/^\/api\/mp\/studios\/(\d+)$/);
  if (studioMatch) {
    const studio = studios.find((item) => String(item.id) === studioMatch[1]);
    return studio || null;
  }

  return null;
};

module.exports = { mockResponse };
