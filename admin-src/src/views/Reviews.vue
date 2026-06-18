<template>
  <div>
    <div class="page-head">
      <div>
        <h1>年审管理</h1>
        <p>接收并核验从小程序在线提交的瑜伽认证材料。批准入册后，全链无缝将资质电子证书推送回其微信。</p>
      </div>
      <button v-if="selected" class="sync-btn" @click="clearSelection">返回队列</button>
    </div>

    <section v-if="!selected && filteredReviews.length === 0 && activeTab === 'pending'" class="empty-review-card">
      <div class="empty-check">✓</div>
      <h2>当前无任何挂起的导师审核申请</h2>
      <p>所有本年度教师认证及年审材料已处理完毕。新的小程序提交材料会进入这里等待管委会专人审核。</p>
    </section>

    <template v-else-if="!selected">
      <div class="review-tabs">
        <button :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
          待审核（{{ pendingCount }}）
        </button>
        <button :class="{ active: activeTab === 'approved' }" @click="activeTab = 'approved'">
          已通过（{{ approvedCount }}）
        </button>
        <button :class="{ active: activeTab === 'rejected' }" @click="activeTab = 'rejected'">
          已驳回（{{ rejectedCount }}）
        </button>
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
              <th>年审年度</th>
              <th>提交时间</th>
              <th>有效期至</th>
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
              <td>{{ review.reviewYear }}</td>
              <td>{{ review.submittedAt }}</td>
              <td>{{ review.expiryDate }}</td>
              <td><button class="table-action" @click="selectedId = review.id">查看</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <section v-else class="review-detail">
      <aside class="profile-panel">
        <img :src="selected.avatar" :alt="selected.name" />
        <h2>{{ selected.name }}</h2>
        <p>证书编号：{{ selected.certNo }}</p>
        <p>喜乐名：{{ selected.xileName }}</p>
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
          <textarea v-model="comment" placeholder="输入审核意见（选填）" maxlength="300"></textarea>
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
import { fetchAdminReviews, submitReviewDecision } from '../api/adminData'

const reviews = ref([])
const activeTab = ref('pending')
const keyword = ref('')
const selectedId = ref(null)
const decision = ref('approved')
const comment = ref('')

onMounted(async () => {
  await loadReviews()
})

async function loadReviews() {
  try {
    reviews.value = await fetchAdminReviews()
  } catch (error) {
    console.warn('年审队列接口暂不可用', error)
  }
}

const pendingCount = computed(() => reviews.value.filter((r) => r.status === 'pending').length)
const approvedCount = computed(() => reviews.value.filter((r) => r.status === 'approved').length)
const rejectedCount = computed(() => reviews.value.filter((r) => r.status === 'rejected').length)

const filteredReviews = computed(() => {
  const list = reviews.value.filter((r) => r.status === activeTab.value)
  const text = keyword.value.trim().toLowerCase()
  if (!text) return list
  return list.filter((r) =>
    [r.name, r.xileName, r.certNo].some((field) => (field || '').toLowerCase().includes(text))
  )
})

const selected = computed(() => reviews.value.find((r) => r.id === selectedId.value))

function clearSelection() {
  selectedId.value = null
  decision.value = 'approved'
  comment.value = ''
}

async function handleDecision(status) {
  const item = selected.value
  if (!item) return
  try {
    await submitReviewDecision(item.id, status, comment.value)
  } catch (error) {
    console.warn('审核接口调用失败', error)
  }
  await loadReviews()
  clearSelection()
}
</script>

<style scoped>
</style>
