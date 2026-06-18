<template>
  <div>
    <div class="page-head">
      <div>
        <h1>年审管理 / 待审核</h1>
        <p>接收并核验从小程序在线提交的瑜伽认证材料。批准入册后，全链无缝将资质电子证书推送回其微信。</p>
      </div>
      <button v-if="selected" class="sync-btn" @click="selectedId = null">返回队列</button>
    </div>

    <section v-if="!selected && pendingReviews.length === 0" class="empty-review-card">
      <div class="empty-check">✓</div>
      <h2>当前无任何挂起的导师审核申请</h2>
      <p>所有本年度教师认证及年审材料已处理完毕。新的小程序提交材料会进入这里等待管委会专人审核。</p>
    </section>

    <template v-else-if="!selected">
      <div class="review-tabs">
        <button class="active">待审核（{{ pendingReviews.length }}）</button>
        <button>已通过（{{ approvedCount }}）</button>
        <button>已驳回（{{ rejectedCount }}）</button>
      </div>

      <div class="admin-searchline">
        <span>⌕</span>
        <input v-model="keyword" placeholder="输入姓名 / 喜乐名 / 证书编号" />
      </div>

      <div class="data-table-wrap roster-wrap">
        <table class="data-table roster-table">
          <thead>
            <tr>
              <th>教师信息</th>
              <th>等级</th>
              <th>到期时间</th>
              <th>提交时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="review in filteredReviews" :key="review.id">
              <td>
                <div class="cell-person compact">
                  <img :src="review.avatar" :alt="review.name" />
                  <div>
                    <strong>{{ review.name }}</strong>
                    <span>喜乐名：{{ review.xileName }}</span>
                  </div>
                </div>
              </td>
              <td><span class="level-text">{{ review.level }}</span></td>
              <td>{{ review.expiryDate }}</td>
              <td>{{ review.submittedAt }}</td>
              <td><button class="table-action" @click="selectedId = review.id">审核</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <section v-else class="review-detail">
      <aside class="profile-panel">
        <img :src="selected.avatar" :alt="selected.name" />
        <h2>{{ selected.name }}</h2>
        <p>喜乐名：{{ selected.xileName }}</p>
        <p>教师编号：{{ selected.certNo }}</p>
        <p>认证等级：{{ selected.level }}</p>
        <p>所属地区：{{ selected.city }}</p>
      </aside>

      <div class="panel review-file-panel">
        <div class="panel-title">
          <h2>年审信息与材料</h2>
          <small>提交时间：{{ selected.submittedAt }}</small>
        </div>

        <div class="review-info-grid">
          <div>
            <span>提交时间</span>
            <strong>{{ selected.submittedAt }}</strong>
          </div>
          <div>
            <span>年审年度</span>
            <strong>{{ selected.reviewYear }}</strong>
          </div>
          <div>
            <span>证书到期</span>
            <strong>{{ selected.expiryDate }}</strong>
          </div>
        </div>

        <div class="file-strip">
          <button v-for="file in selected.files" :key="file">📄 {{ file }}</button>
        </div>

        <div class="review-decision">
          <label>
            <input type="radio" value="approved" v-model="decision" />
            通过
          </label>
          <label>
            <input type="radio" value="rejected" v-model="decision" />
            驳回
          </label>
          <textarea v-model="note" placeholder="输入审核意见（选填）" maxlength="300"></textarea>
        </div>

        <div class="review-actions">
          <button class="reject" @click="handleDecision('rejected')">驳回材料</button>
          <button class="approve" @click="handleDecision('approved')">确认审核</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchAdminReviews, submitReviewDecision } from '../api/adminData.js'

const route = useRoute()
const keyword = ref('')
const selectedId = ref(route.query.review ? Number(route.query.review) : null)
const decision = ref('approved')
const note = ref('')

const reviews = ref([
  {
    id: 1,
    name: '陈晨',
    xileName: '清宁',
    level: 'L2',
    certNo: 'JY20230017',
    city: '上海市',
    expiryDate: '2024.06.30',
    submittedAt: '2024.05.20 14:30',
    reviewYear: '2024年度',
    status: 'pending',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    files: ['教学证明.pdf', '培训证书.pdf', '继续教育.pdf'],
  },
  {
    id: 2,
    name: '周周',
    xileName: '香乐',
    level: 'L1',
    certNo: 'JY20230026',
    city: '北京市',
    expiryDate: '2024.06.30',
    submittedAt: '2024.05.18 09:10',
    reviewYear: '2024年度',
    status: 'pending',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=200&auto=format&fit=crop',
    files: ['课时记录.pdf', '身份证明.jpg'],
  },
])

onMounted(async () => {
  try {
    reviews.value = await fetchAdminReviews()
  } catch (error) {
    console.warn('年审队列接口暂不可用，保留本地演示数据', error)
  }
})

const pendingReviews = computed(() => reviews.value.filter((item) => item.status === 'pending'))
const approvedCount = computed(() => reviews.value.filter((item) => item.status === 'approved').length)
const rejectedCount = computed(() => reviews.value.filter((item) => item.status === 'rejected').length)
const filteredReviews = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return pendingReviews.value
  return pendingReviews.value.filter((item) => [item.name, item.xileName, item.certNo].some((field) => field.toLowerCase().includes(text)))
})
const selected = computed(() => reviews.value.find((item) => item.id === selectedId.value))

async function handleDecision(status) {
  const item = selected.value
  if (!item) return
  try {
    await submitReviewDecision(item.id, status, note.value)
    item.status = status
    item.note = note.value
  } catch (error) {
    console.warn('审核接口暂不可用，已仅更新本地演示状态', error)
    item.status = status
    item.note = note.value
  }
  selectedId.value = null
  decision.value = 'approved'
  note.value = ''
}
</script>
