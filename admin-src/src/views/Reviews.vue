<template>
  <div>
    <div class="page-head">
      <div>
        <h1>年审管理</h1>
        <p>查看教师本期提交的材料，并在详情中一键完成通过、驳回或退回补充。</p>
      </div>
      <button v-if="selected" class="sync-btn" @click="clearSelection">返回队列</button>
    </div>

    <section v-if="!selected && pendingCount === 0 && activeTab === 'pending'" class="empty-review-card">
      <div class="empty-check">✓</div>
      <h2>当前无任何挂起的导师审核申请</h2>
      <p>所有本年度教师认证及年审材料已处理完毕。新的小程序提交材料会进入这里等待管委会专人审核。</p>
    </section>

    <template v-else-if="!selected">
      <div class="review-tabs">
        <button :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
          待处理（{{ pendingCount }}）
        </button>
        <button :class="{ active: activeTab === 'approved' }" @click="activeTab = 'approved'">
          已通过（{{ approvedCount }}）
        </button>
        <button :class="{ active: activeTab === 'rejected' }" @click="activeTab = 'rejected'">
          已驳回（{{ rejectedCount }}）
        </button>
      </div>

      <div class="toolbar">
        <input v-model="filters.name" placeholder="教师姓名" />
        <input v-model="filters.xileName" placeholder="喜乐名" />
        <input v-model="filters.certNo" placeholder="证书编号" />
        <input v-model="filters.city" placeholder="城市" />
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
            <tr v-if="!pagedReviews.length"><td colspan="6" class="empty-cell">暂无符合筛选条件的年审记录</td></tr>
            <tr v-for="review in pagedReviews" :key="review.id">
              <td>
                <div class="cell-person compact">
                  <ImagePreview v-if="review.avatar" :src="review.avatar" :alt="review.name" image-class="review-avatar" />
                  <div v-else class="review-avatar-fallback">{{ (review.name || '教').slice(0, 1) }}</div>
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
        <Pagination v-model:current-page="currentPage" :total-pages="totalPages" :total-items="filteredReviews.length" />
      </div>
    </template>

    <section v-else class="review-detail">
      <aside class="profile-panel">
        <ImagePreview v-if="selected.avatar" :src="selected.avatar" :alt="selected.name" image-class="review-avatar-large" />
        <div v-else class="review-avatar-fallback review-avatar-fallback--large">{{ (selected.name || '教').slice(0, 1) }}</div>
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
          <a
            v-for="file in selected.files"
            :key="file.id"
            :href="file.url"
            target="_blank"
            rel="noopener"
            class="file-link"
            :title="file.name"
          >
            <span class="file-icon">{{ file.type && file.type.startsWith('image') ? '🖼' : '📄' }}</span>
            {{ file.name }}
          </a>
        </div>

        <div v-if="selected.teachingRecords?.length" class="teaching-records">
          <h3>本次年审引用的教学记录</h3>
          <div v-for="record in selected.teachingRecords" :key="record.id" class="record-row">
            <strong>{{ record.title }}</strong><span>{{ record.taughtOn }} · {{ record.platform }}</span>
            <a v-if="record.evidenceUrl" :href="record.evidenceUrl" target="_blank" rel="noopener">查看佐证</a>
          </div>
        </div>
        <div v-if="selected.serviceRecords?.length" class="teaching-records">
          <h3>本次年审引用的服务记录</h3>
          <div v-for="record in selected.serviceRecords" :key="record.id" class="record-row">
            <strong>{{ record.title }}</strong><span>{{ record.servedOn }} · {{ record.serviceType }}{{ record.location ? ' · ' + record.location : '' }}</span>
            <a v-if="record.evidenceUrl" :href="record.evidenceUrl" target="_blank" rel="noopener">查看佐证</a>
          </div>
        </div>

        <div v-if="reviewActionable" class="decision-block">
          <h3>审核处理</h3>
          <p class="form-hint">处理后将同步更新教师端结果；通过会为教师续期，驳回/退回补充需填写原因以便教师补充材料重新提交。</p>
          <textarea v-model="decisionComment" placeholder="审核意见或驳回 / 退回补充的原因（驳回与退回补充时必填）"></textarea>
          <div class="decision-actions">
            <button class="approve-btn" :disabled="deciding" @click="applyDecision('approved')">通过</button>
            <button class="reject-btn" :disabled="deciding" @click="applyDecision('rejected', true)">驳回</button>
            <button class="return-btn" :disabled="deciding" @click="applyDecision('rejected', true, true)">退回补充</button>
          </div>
        </div>
        <div v-else class="reviewer-comment">
          <strong>处理结果：</strong>{{ statusLabel(selected.status) }}
          <span v-if="selected.reviewerComment"> · {{ selected.reviewerComment }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ImagePreview from '../components/ImagePreview.vue'
import { fetchAdminReviews, decideReview } from '../api/adminData'
import { useToast } from '../composables/useToast'
import Pagination from '../components/Pagination.vue'

const { show: toast } = useToast()
const reviews = ref([])
const activeTab = ref('pending')
const filters = ref({ name: '', xileName: '', certNo: '', city: '' })
const selectedId = ref(null)
const currentPage = ref(1)
const pageSize = 15
const decisionComment = ref('')
const deciding = ref(false)

const PENDING_STATUSES = ['submitted', 'in_review', 'pending_publication', 'pending_publication_rejected', 'returned_to_group']
const APPROVED_STATUSES = ['approved', 'published_approved']
const REJECTED_STATUSES = ['rejected', 'published_rejected']

function tabOf(status) {
  if (APPROVED_STATUSES.includes(status)) return 'approved'
  if (REJECTED_STATUSES.includes(status)) return 'rejected'
  return 'pending'
}

function statusLabel(status) {
  return { pending: '待处理', submitted: '待处理', in_review: '审核中', pending_publication: '待发布', pending_publication_rejected: '待发布', returned_to_group: '待处理', approved: '已通过', published_approved: '已通过', rejected: '已驳回', published_rejected: '已驳回' }[status] || status
}

onMounted(async () => {
  await loadReviews()
})

async function loadReviews() {
  try {
    reviews.value = await fetchAdminReviews()
  } catch (error) {
    toast('年审队列加载失败', 'error')
  }
}

const pendingCount = computed(() => reviews.value.filter((r) => tabOf(r.status) === 'pending').length)
const approvedCount = computed(() => reviews.value.filter((r) => tabOf(r.status) === 'approved').length)
const rejectedCount = computed(() => reviews.value.filter((r) => tabOf(r.status) === 'rejected').length)

const filteredReviews = computed(() => {
  const list = reviews.value.filter((r) => tabOf(r.status) === activeTab.value)
  const matches = (value, query) => !query || String(value || '').toLowerCase().includes(query)
  const name = filters.value.name.trim().toLowerCase()
  const xileName = filters.value.xileName.trim().toLowerCase()
  const certNo = filters.value.certNo.trim().toLowerCase()
  const city = filters.value.city.trim().toLowerCase()
  return list.filter((r) => matches(r.name, name) && matches(r.xileName, xileName) && matches(r.certNo, certNo) && matches(r.city, city))
})

const totalPages = computed(() => Math.ceil(filteredReviews.value.length / pageSize))
const pagedReviews = computed(() => filteredReviews.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
watch([activeTab, filters], () => { currentPage.value = 1 }, { deep: true })
watch(totalPages, (total) => {
  if (total > 0 && currentPage.value > total) currentPage.value = total
})

const selected = computed(() => reviews.value.find((r) => r.id === selectedId.value))
const reviewActionable = computed(() => selected.value && PENDING_STATUSES.includes(selected.value.status))

function clearSelection() {
  selectedId.value = null
  decisionComment.value = ''
}

async function applyDecision(status, requireComment = false, isReturn = false) {
  const review = selected.value
  if (!review) return
  const comment = decisionComment.value.trim()
  if (requireComment && !comment) {
    toast(isReturn ? '退回补充需填写原因' : '驳回需填写原因', 'error')
    return
  }
  if (status === 'approved' && !window.confirm(`确认通过「${review.name}」的本期年审？通过后将为其续期。`)) return
  deciding.value = true
  try {
    await decideReview(review.id, status, comment)
    toast(isReturn ? '已退回补充' : status === 'approved' ? '已通过并续期' : '已驳回')
    await loadReviews()
    clearSelection()
  } catch (error) {
    toast('处理失败，请稍后重试', 'error')
  } finally {
    deciding.value = false
  }
}
</script>

<style scoped>
.file-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  color: #333;
  text-decoration: none;
  font-size: 13px;
  transition: border-color 0.15s, background 0.15s;
}
.file-link:hover {
  border-color: var(--brand-green, #4a7c59);
  background: #f6faf7;
}
.file-icon {
  font-size: 16px;
}
.reviewer-comment {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fef9f0;
  border-left: 3px solid #c28a1a;
  border-radius: 4px;
  font-size: 13px;
  color: #5a4a28;
}
.decision-block {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid var(--brand-green, rgba(66, 109, 88, 0.35));
  border-radius: 12px;
  background: #f7faf7;
}
.decision-block h3 {
  margin: 0 0 8px;
  font-size: 15px;
}
.decision-block textarea {
  width: 100%;
  min-height: 80px;
  margin: 12px 0;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d9ded9;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
}
.form-hint {
  color: #65706a;
  font-size: 13px;
  margin: 0 0 4px;
}
.decision-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.decision-actions button {
  min-height: 38px;
  padding: 0 20px;
  border: 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
}
.decision-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.approve-btn { background: var(--brand-green, #4a7c59); }
.reject-btn { background: #b3543f; }
.return-btn { background: #9c7a1a; }
.teaching-records { margin-top: 18px; border-top: 1px solid #eee; padding-top: 14px; }
.teaching-records h3 { margin: 0 0 10px; font-size: 15px; }
.record-row { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.record-row span { color: #65706a; }
.record-row a { margin-left: auto; color: #426c55; }
.review-avatar-fallback {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 36px;
  border-radius: 50%;
  background: var(--brand-green-light, #edf5ef);
  color: var(--brand-green, #426d58);
  font-weight: 800;
  font-size: 14px;
}
.review-avatar-fallback--large {
  width: 64px;
  height: 64px;
  flex-basis: 64px;
  font-size: 24px;
}
</style>
