import api from './index.js'
import { normalizeMultiline } from '../utils/text.js'
import defaultAvatar from '../assets/avatar-default.jpg'

const DEFAULT_STUDIO = 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop'

// 教师无头像时回退到本地默认头像（灰色人形剪影，与小程序端一致）。
function resolveAvatar(url) {
  if (!url || url.startsWith('/static/demo/')) return defaultAvatar
  return url
}

export function mapAdminTeacher(teacher) {
  return {
    id: teacher.id,
    name: teacher.name,
    xileName: teacher.xileName,
    alias: teacher.alias || '',
    idNumber: teacher.idNumber || '',
    level: teacher.tier ? `${teacher.tier} ${teacher.tierName || ''}`.trim() : '',
    tier: teacher.tier,
    certNo: teacher.teacherNo,
    expiryDate: teacher.validUntil || '待确认',
    certifiedAt: teacher.certifiedAt,
    currentTierCertifiedOn: teacher.currentTierCertifiedOn || '',
    residences: teacher.residences || [],
    avatar: resolveAvatar(teacher.avatarUrl),
    avatarUrl: teacher.avatarUrl || '',
    certificateUrl: teacher.certificateUrl || '',
    phone: teacher.phone || '未登记',
    city: teacher.city,
    district: teacher.district,
    status: teacher.status,
    committeeRemark: teacher.committeeRemark,
    teachingSummary: normalizeMultiline(teacher.teachingSummary),
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
    // 联系工作室图片：详情页点选后预览，内含电话、二维码等联系方式。
    contactImage: studio.contactImage || '',
    intro: studio.intro || '',
    courseIntro: normalizeMultiline(studio.courseIntro),
    openingHours: studio.openingHours || '',
    images: Array.isArray(studio.images) ? studio.images : [],
    image: studio.coverUrl || DEFAULT_STUDIO,
    coverUrl: studio.coverUrl || '',
    ownerTeachers: Array.isArray(studio.ownerTeachers) ? studio.ownerTeachers : [],
    managerTeachers: Array.isArray(studio.managerTeacherIds) ? studio.managerTeacherIds : [],
    ownerTeacherName: studio.ownerTeacherName,
    latitude: studio.latitude ?? null,
    longitude: studio.longitude ?? null,
    status: studio.status,
    hasPending: Boolean(studio.hasPending),
    pendingRejectReason: normalizeMultiline(studio.pendingRejectReason),
    pending: studio.pending
      ? { ...studio.pending, courseIntro: normalizeMultiline(studio.pending.courseIntro) }
      : null,
  }
}

export function mapAdminReview(review) {
  return {
    id: review.id,
    name: review.teacherName,
    certNo: review.teacherNo,
    xileName: review.xileName,
    level: review.tier ? `${review.tier} ${review.tierName || ''}`.trim() : '',
    city: review.city,
    avatar: resolveAvatar(review.avatarUrl),
    status: review.status,
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
    teachingRecords: review.teachingRecords || [],
    serviceRecords: review.serviceRecords || [],
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

export async function fetchMapConfig() {
  return api.get('/map-config')
}

export async function searchMapPlaces(keyword, region) {
  return api.get('/map-search', { keyword, region })
}

export async function reverseGeocodeMapLocation(latitude, longitude) {
  return api.get('/map-reverse-geocode', { latitude, longitude })
}

export async function fetchAdminReviews() {
  const payload = await api.get('/reviews')
  return (payload.items || []).map(mapAdminReview)
}

export async function fetchAdminTeachingRecords(params = {}) {
  const payload = await api.get('/teaching-records', params)
  return payload.items || []
}

export async function updateTeachingRecord(id, data) {
  return api.put(`/teaching-records/${id}`, data)
}

export async function deleteTeachingRecord(id) {
  return api.delete(`/teaching-records/${id}`)
}

export async function fetchAdminServiceRecords(params = {}) {
  const payload = await api.get('/service-records', params)
  return payload.items || []
}

export async function updateServiceRecord(id, data) {
  return api.put(`/service-records/${id}`, data)
}

export async function deleteServiceRecord(id) {
  return api.delete(`/service-records/${id}`)
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

export async function approveStudio(id) {
  return api.post(`/studios/${id}/approve`)
}

export async function rejectStudio(id, reason) {
  return api.post(`/studios/${id}/reject`, { reason })
}

export async function decideReview(reviewId, status, comment) {
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

export async function uploadAdminAsset(file, assetType) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('assetType', assetType)
  return api.upload('/assets/upload', formData)
}

