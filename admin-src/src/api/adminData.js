import api from './index.js'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop'
const DEFAULT_STUDIO = 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop'

export function mapAdminTeacher(teacher) {
  return {
    name: teacher.name,
    level: `${teacher.tier || ''}${teacher.tierName || ''}`,
    certNo: teacher.teacherNo,
    expiryDate: teacher.validUntil || '待确认',
    avatar: teacher.avatarUrl || DEFAULT_AVATAR,
    phone: teacher.phone || '未登记',
  }
}

export function mapAdminStudio(studio) {
  return {
    name: studio.name,
    tags: studio.status === 'open' ? '开放中' : '暂不公开',
    city: studio.city,
    address: studio.address,
    contact: studio.contactText || '预约请通过有赞学堂',
    image: studio.coverUrl || DEFAULT_STUDIO,
    status: studio.status,
  }
}

export function mapAdminReview(review) {
  return {
    id: review.id,
    name: review.teacherName,
    certNo: review.teacherNo,
    xileName: review.xileName,
    level: review.tier,
    city: review.city,
    status: review.status === 'submitted' ? 'pending' : review.status,
    reviewYear: `${review.reviewYear}年度`,
    submittedAt: review.submittedAt || '未记录',
    expiryDate: review.previousValidUntil || '待确认',
    nextValidUntil: review.nextValidUntil,
    files: (review.files || []).map((file) => file.filename || file.fileName || '未命名材料'),
  }
}

export function mapDashboardCards(stats) {
  return [
    { title: '教师总数', value: String(stats.teacherCount ?? 0), change: `活跃 ${stats.activeTeacherCount ?? 0} 位` },
    { title: '待审核人数', value: String(stats.pendingReviewCount ?? 0), change: '待管委会处理' },
    { title: '开放工作室', value: String(stats.openStudioCount ?? 0), change: '小程序可查询' },
    { title: '已入库教师', value: String(stats.teacherCount ?? 0), change: '后台教师档案' },
  ]
}

export function buildReviewDecisionPayload(status, comment) {
  return {
    status,
    comment,
  }
}

export async function fetchAdminTeachers() {
  const payload = await api.get('/teachers')
  return (payload.items || []).map(mapAdminTeacher)
}

export async function fetchAdminStudios() {
  const payload = await api.get('/studios')
  return (payload.items || []).map(mapAdminStudio)
}

export async function fetchAdminReviews() {
  const payload = await api.get('/reviews')
  return (payload.items || []).map(mapAdminReview)
}

export async function fetchDashboardCards() {
  const payload = await api.get('/stats/dashboard')
  return mapDashboardCards(payload)
}

export async function submitReviewDecision(reviewId, status, comment) {
  return api.post(`/reviews/${reviewId}/decision`, buildReviewDecisionPayload(status, comment))
}
