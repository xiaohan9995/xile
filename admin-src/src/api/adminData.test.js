import test from 'node:test'
import assert from 'node:assert/strict'

import { mapAdminReview, mapAdminStudio, mapAdminTeacher, mapDashboardCards } from './adminData.js'

test('maps admin teacher API records to roster rows', () => {
  const result = mapAdminTeacher({
    id: 1,
    name: '张三',
    xileName: '善悦',
    tier: 'L3',
    tierName: '认证导师',
    teacherNo: 'JY20230001',
    validUntil: '2028.12.31',
    certifiedAt: '2023.01.01',
    avatarUrl: '/static/demo/teacher.jpg',
    phone: '13800000000',
    city: '上海市',
    status: 'active',
  })
  assert.equal(result.id, 1)
  assert.equal(result.name, '张三')
  assert.equal(result.level, 'L3认证导师')
  assert.equal(result.certNo, 'JY20230001')
  assert.equal(result.expiryDate, '2028.12.31')
  assert.equal(result.avatar, '/static/demo/teacher.jpg')
  assert.equal(result.phone, '13800000000')
  assert.equal(result.city, '上海市')
})

test('maps admin studio API records to studio rows', () => {
  const result = mapAdminStudio({
    id: 1,
    name: '静心瑜伽空间',
    city: '上海市',
    district: '徐汇区',
    address: '上海市徐汇区衡山路 88 号',
    contactText: '由客服统一对接',
    coverUrl: '/static/demo/studio.jpg',
    tags: ['静心冥想', '小班授课'],
    status: 'open',
    ownerTeacherName: '张三',
  })
  assert.equal(result.id, 1)
  assert.equal(result.name, '静心瑜伽空间')
  assert.deepEqual(result.tags, ['静心冥想', '小班授课'])
  assert.equal(result.city, '上海市')
  assert.equal(result.status, 'open')
  assert.equal(result.ownerTeacherName, '张三')
})

test('maps admin review API records to review queue rows', () => {
  const result = mapAdminReview({
    id: 8,
    teacherName: '李四',
    teacherNo: 'JY20230002',
    xileName: '清心',
    tier: 'L2',
    city: '北京市',
    avatarUrl: '/static/demo/teacher.jpg',
    status: 'submitted',
    reviewYear: 2026,
    submittedAt: '2026.06.01 10:20',
    previousValidUntil: '2026.06.30',
    nextValidUntil: '2028.06.30',
    files: [{ filename: '继续教育证明.pdf' }],
  })
  assert.equal(result.id, 8)
  assert.equal(result.name, '李四')
  assert.equal(result.status, 'pending')
  assert.equal(result.avatar, '/static/demo/teacher.jpg')
  assert.equal(result.reviewYear, '2026年度')
  assert.deepEqual(result.files, [{ id: undefined, name: '继续教育证明.pdf', url: undefined, type: '' }])
})

test('maps dashboard stats to KPI cards', () => {
  const result = mapDashboardCards({
    teacherCount: 5,
    activeTeacherCount: 4,
    pendingReviewCount: 1,
    openStudioCount: 3,
    expiringCount: 2,
    completedReviewCount: 10,
  })
  assert.equal(result[0].title, '教师总数')
  assert.equal(result[0].value, '5')
  assert.equal(result[1].title, '待审核人数')
  assert.equal(result[2].title, '即将到期')
  assert.equal(result[2].value, '2')
  assert.equal(result[3].title, '已完成年审')
  assert.equal(result[3].value, '10')
})
