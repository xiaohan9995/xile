import test from 'node:test'
import assert from 'node:assert/strict'

import { buildReviewDecisionPayload, mapAdminReview, mapAdminStudio, mapAdminTeacher, mapDashboardCards } from './adminData.js'

test('maps admin teacher API records to roster rows', () => {
  assert.deepEqual(
    mapAdminTeacher({
      name: '张三',
      tier: 'L3',
      tierName: '认证导师',
      teacherNo: 'JY20230001',
      validUntil: '2028.12.31',
      avatarUrl: '/static/demo/teacher.jpg',
      phone: '13800000000',
    }),
    {
      name: '张三',
      level: 'L3认证导师',
      certNo: 'JY20230001',
      expiryDate: '2028.12.31',
      avatar: '/static/demo/teacher.jpg',
      phone: '13800000000',
    },
  )
})

test('maps admin studio API records to studio rows', () => {
  assert.deepEqual(
    mapAdminStudio({
      name: '喜乐瑜伽静安馆',
      city: '上海市',
      address: '上海市静安区常德路 88 号',
      contactText: '预约请通过有赞学堂',
      coverUrl: '/static/demo/studio.jpg',
      status: 'open',
    }),
    {
      name: '喜乐瑜伽静安馆',
      tags: '开放中',
      city: '上海市',
      address: '上海市静安区常德路 88 号',
      contact: '预约请通过有赞学堂',
      image: '/static/demo/studio.jpg',
      status: 'open',
    },
  )
})

test('maps admin review API records to review queue rows', () => {
  assert.deepEqual(
    mapAdminReview({
      id: 8,
      teacherName: '李四',
      teacherNo: 'JY20230002',
      xileName: '清心',
      tier: 'L2',
      city: '北京市',
      status: 'submitted',
      reviewYear: 2026,
      submittedAt: '2026.06.01 10:20',
      previousValidUntil: '2026.06.30',
      nextValidUntil: '2028.06.30',
      files: [{ filename: '继续教育证明.pdf' }],
    }),
    {
      id: 8,
      name: '李四',
      certNo: 'JY20230002',
      xileName: '清心',
      level: 'L2',
      city: '北京市',
      status: 'pending',
      reviewYear: '2026年度',
      submittedAt: '2026.06.01 10:20',
      expiryDate: '2026.06.30',
      nextValidUntil: '2028.06.30',
      files: ['继续教育证明.pdf'],
    },
  )
})

test('maps dashboard stats to KPI cards', () => {
  assert.deepEqual(
    mapDashboardCards({
      teacherCount: 3,
      activeTeacherCount: 2,
      pendingReviewCount: 1,
      openStudioCount: 2,
    }),
    [
      { title: '教师总数', value: '3', change: '活跃 2 位' },
      { title: '待审核人数', value: '1', change: '待管委会处理' },
      { title: '开放工作室', value: '2', change: '小程序可查询' },
      { title: '已入库教师', value: '3', change: '后台教师档案' },
    ],
  )
})

test('builds review decision payload for backend API', () => {
  assert.deepEqual(buildReviewDecisionPayload('rejected', '课时证明缺失'), {
    status: 'rejected',
    comment: '课时证明缺失',
  })
})
