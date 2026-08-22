import api from './index.js'

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop'
const DEFAULT_STUDIO = 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop'

function resolveAvatar(url) {
  if (!url || url.startsWith('/static/demo/')) return DEFAULT_AVATAR
  return url
}

export function mapAdminTeacher(teacher) {
  return {
    id: teacher.id,
    name: teacher.name,
    xileName: teacher.xileName,
    level: `${teacher.tier || ''}${teacher.tierName || ''}`,
    tier: teacher.tier,
    certNo: teacher.teacherNo,
    expiryDate: teacher.validUntil || '待确认',
    certifiedAt: teacher.certifiedAt,
    avatar: resolveAvatar(teacher.avatarUrl),
    avatarUrl: teacher.avatarUrl || '',
    certificateUrl: teacher.certificateUrl || '',
    phone: teacher.phone || '未登记',
    city: teacher.city,
    district: teacher.district,
    status: teacher.status,
    committeeRemark: teacher.committeeRemark,
  }
}

export function mapAdminStudio(studio) {
  return {
    id: studio.id,
    name: studio.name,
    tags: Array.isArray(studio.tags) ? studio.tags : [],
    city: studio.city,
    district: studio.district,
    address: studio.address,
    contact: studio.contactText || '',
    intro: studio.intro || '',
    openingHours: studio.openingHours || '',
    image: studio.coverUrl || DEFAULT_STUDIO,
    coverUrl: studio.coverUrl || '',
    status: studio.status,
    ownerTeacherName: studio.ownerTeacherName,
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
    avatar: resolveAvatar(review.avatarUrl),
    status: review.status === 'submitted' ? 'pending' : review.status,
    reviewYear: `${review.reviewYear}年度`,
    submittedAt: review.submittedAt || '未记录',
    expiryDate: review.previousValidUntil || '待确认',
    nextValidUntil: review.nextValidUntil,
    reviewedAt: review.reviewedAt,
    reviewerComment: review.reviewerComment || '',
    cycleId: review.cycleId || null,
    cycleName: review.cycleName || '',
    groupId: review.groupId || null,
    groupName: review.groupName || '',
    groupDecision: review.groupDecision || '',
    publishedAt: review.publishedAt || null,
    files: (review.files || []).map((file) => ({
      id: file.id,
      name: file.filename || file.fileName || '未命名材料',
      url: file.url,
      type: file.fileType || '',
    })),
  }
}

export function mapDashboardCards(stats) {
  return [
    { title: '教师总数', value: String(stats.teacherCount ?? 0), change: `活跃 ${stats.activeTeacherCount ?? 0} 位` },
    { title: '待审核人数', value: String(stats.pendingReviewCount ?? 0), change: '待管委会处理' },
    { title: '即将到期', value: String(stats.expiringCount ?? 0), change: '90 天内到期' },
    { title: '已完成年审', value: String(stats.completedReviewCount ?? 0), change: '本年度通过' },
  ]
}

// ─── Fetch functions ────────────────────────────────────────────────────────

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

export async function fetchAnalytics() {
  return api.get('/analytics')
}

export async function fetchSettings() {
  return api.get('/settings')
}

export async function fetchPermissions() {
  const payload = await api.get('/permissions')
  return payload.items || []
}

// ─── Write functions ────────────────────────────────────────────────────────

export async function createTeacher(data) {
  return api.post('/teachers', data)
}

export async function updateTeacher(id, data) {
  return api.put(`/teachers/${id}`, data)
}

export async function deleteTeacher(id) {
  return api.delete(`/teachers/${id}`)
}

export async function createStudio(data) {
  return api.post('/studios', data)
}

export async function updateStudio(id, data) {
  return api.put(`/studios/${id}`, data)
}

export async function deleteStudio(id) {
  return api.delete(`/studios/${id}`)
}

export async function submitReviewDecision(reviewId, status, comment) {
  return api.post(`/reviews/${reviewId}/decision`, { status, comment })
}

export async function uploadImportPreview(file) {
  const formData = new FormData()
  formData.append('file', file)
  return api.upload('/import/teachers/preview', formData)
}

export async function downloadImportTemplate() {
  const response = await api.raw.get('/import/teachers/template', { responseType: 'blob' })
  const url = URL.createObjectURL(response)
  const link = document.createElement('a')
  link.href = url
  link.download = '教师批量导入模板.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}

export async function commitImport(batchId, file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('batchId', batchId)
  return api.upload('/import/teachers/commit', formData)
}

export async function saveSettings(data) {
  return api.put('/settings', data)
}

export async function inviteAdmin(data) {
  return api.post('/permissions/invite', data)
}

export async function updateAdminRole(adminId, role) {
  return api.put(`/permissions/${adminId}/role`, { role })
}

export async function fetchUsers() {
  const payload = await api.get('/users')
  return payload.items || []
}

export async function updateUserRole(userId, role, teacherId) {
  return api.put(`/users/${userId}/role`, { role, teacherId: teacherId || undefined })
}

export async function deleteUser(userId) {
  return api.delete(`/users/${userId}`)
}

export async function createTeacherAccount(data) {
  return api.post('/teacher-accounts', data)
}

export async function createTeacherLinkCode(teacherId) {
  return api.post(`/teachers/${teacherId}/link-code`)
}

export async function uploadAdminAsset(file, assetType) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('assetType', assetType)
  return api.upload('/assets/upload', formData)
}

export async function fetchReviewCycles() {
  const payload = await api.get('/review-cycles')
  return payload.items || []
}

export async function createReviewCycle(data) {
  return api.post('/review-cycles', data)
}

export async function fetchReviewGroups() {
  const payload = await api.get('/review-groups')
  return payload.items || []
}

export async function createReviewGroup(data) {
  return api.post('/review-groups', data)
}

export async function assignReview(reviewId, data) {
  return api.post(`/reviews/${reviewId}/assignment`, data)
}

export async function fetchReviewWorkflow(reviewId) {
  return api.get(`/reviews/${reviewId}/workflow`)
}

export async function submitReviewOpinion(reviewId, data) {
  return api.post(`/reviews/${reviewId}/opinions`, data)
}

export async function submitGroupDecision(reviewId, data) {
  return api.post(`/reviews/${reviewId}/group-decision`, data)
}

export async function publishReview(reviewId, outcome) {
  return api.post(`/reviews/${reviewId}/publish`, { outcome })
}

export async function returnReviewToGroup(reviewId, reason) {
  return api.post(`/reviews/${reviewId}/return-to-group`, { reason })
}
