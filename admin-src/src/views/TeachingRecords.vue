<template>
  <div>
    <div class="page-head">
      <div><h1>教学记录</h1><p>查看、修改或删除教师提交的教学活动；记录可作为年审佐证材料。</p></div>
      <div class="page-head-actions">
        <button class="refresh-btn" :class="{ 'is-spinning': refreshing }" :disabled="refreshing" @click="refresh">
          <span class="refresh-icon">↻</span>{{ refreshing ? '刷新中…' : '刷新' }}
        </button>
      </div>
    </div>
    <div class="toolbar">
      <input v-model="filters.teacherName" placeholder="教师姓名或喜乐名" />
      <input v-model="filters.platform" placeholder="教学平台" />
      <select v-model="filters.status"><option value="">全部状态</option><option value="submitted">已提交</option><option value="draft">草稿</option></select>
    </div>
    <div class="data-table-wrap roster-wrap">
      <table class="data-table roster-table">
        <thead><tr><th>教师</th><th>教学日期</th><th>平台 / 活动</th><th>时长 / 人数</th><th>状态</th><th>佐证</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-if="!pagedRecords.length"><td colspan="7" class="empty-cell">暂无符合筛选条件的教学记录</td></tr>
          <tr v-for="record in pagedRecords" :key="record.id">
            <td><strong>{{ record.teacherName }}</strong><br><small>{{ record.xileName || '—' }} · {{ record.certificateNo || '未认证' }}</small></td>
            <td>{{ record.taughtOn }}</td>
            <td><strong>{{ record.title }}</strong><br><small>{{ record.platform }}</small><br><small v-if="record.description" class="multiline-text">{{ record.description }}</small></td>
            <td>{{ record.durationHours || '—' }} 小时 / {{ record.participantCount || '—' }} 人</td>
            <td><span class="status-tag" :class="record.status === 'submitted' ? 'status-active' : ''">{{ record.status === 'submitted' ? '已提交' : '草稿' }}</span></td>
            <td><a v-if="record.evidenceUrl" :href="record.evidenceUrl" target="_blank" rel="noopener" class="table-action">查看附件</a><span v-else>—</span></td>
            <td class="table-actions">
              <button class="table-action" @click="openEdit(record)">编辑</button>
              <button class="danger-action" @click="handleDelete(record)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:current-page="currentPage" :total-pages="totalPages" :total-items="filteredRecords.length" />
    </div>

    <!-- Edit Modal -->
    <div v-if="showEdit" class="modal-backdrop" @click.self="showEdit = false">
      <form class="admin-modal" @submit.prevent="handleUpdate">
        <div class="modal-head">
          <h2>编辑教学记录</h2>
          <button type="button" @click="showEdit = false">×</button>
        </div>
        <label>
          <span class="field-label">教学日期 <em>*</em></span>
          <input v-model="editDraft.taughtOn" type="date" required />
        </label>
        <label>
          <span class="field-label">教学平台 <em>*</em></span>
          <input v-model="editDraft.platform" required />
        </label>
        <label>
          <span class="field-label">活动名称 <em>*</em></span>
          <input v-model="editDraft.title" required />
        </label>
        <div class="form-grid two">
          <label>时长（小时）<input v-model="editDraft.durationHours" type="number" step="0.1" min="0" /></label>
          <label>参与人数<input v-model="editDraft.participantCount" type="number" min="0" /></label>
        </div>
        <label>活动说明<textarea v-model="editDraft.description"></textarea></label>
        <label>状态
          <select v-model="editDraft.status">
            <option value="submitted">已提交</option>
            <option value="draft">草稿</option>
          </select>
        </label>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showEdit = false">取消</button>
          <button type="submit" class="primary-btn">保存</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { fetchAdminTeachingRecords, updateTeachingRecord, deleteTeachingRecord } from '../api/adminData'
import Pagination from '../components/Pagination.vue'
import { useToast } from '../composables/useToast'
import { normalizeMultiline } from '../utils/text.js'

const { show: toast } = useToast()
const records = ref([])
const filters = ref({ teacherName: '', platform: '', status: '' })
const currentPage = ref(1)
const pageSize = 15
const showEdit = ref(false)
const editDraft = ref({ id: null, taughtOn: '', platform: '', title: '', durationHours: '', participantCount: '', description: '', status: 'submitted' })

async function loadRecords() {
  try { records.value = await fetchAdminTeachingRecords() } catch (_) { toast('教学记录加载失败', 'error') }
}
onMounted(loadRecords)

const refreshing = ref(false)
async function refresh() {
  refreshing.value = true
  try { await loadRecords() } finally { refreshing.value = false }
}

const filteredRecords = computed(() => {
  const match = (value, query) => !query || String(value || '').toLowerCase().includes(query)
  const teacher = filters.value.teacherName.trim().toLowerCase()
  const platform = filters.value.platform.trim().toLowerCase()
  return records.value.filter((item) => match(`${item.teacherName || ''}${item.xileName || ''}`, teacher) && match(item.platform, platform) && (!filters.value.status || item.status === filters.value.status))
})
const totalPages = computed(() => Math.ceil(filteredRecords.value.length / pageSize))
const pagedRecords = computed(() => filteredRecords.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
watch(filters, () => { currentPage.value = 1 }, { deep: true })

function toDateInput(value) {
  // backend returns %Y.%m.%d (e.g. 2026.09.18); <input type="date"> needs YYYY-MM-DD
  return String(value || '').replace(/\./g, '-').slice(0, 10)
}

function openEdit(record) {
  editDraft.value = {
    id: record.id,
    taughtOn: toDateInput(record.taughtOn),
    platform: record.platform || '',
    title: record.title || '',
    durationHours: record.durationHours ?? '',
    participantCount: record.participantCount ?? '',
    description: record.description || '',
    status: record.status || 'submitted',
  }
  showEdit.value = true
}

async function handleUpdate() {
  const d = editDraft.value
  if (!d.taughtOn || !d.platform.trim() || !d.title.trim()) {
    toast('请填写日期、平台和活动名称', 'error')
    return
  }
  try {
    await updateTeachingRecord(d.id, {
      taughtOn: d.taughtOn,
      platform: d.platform,
      title: d.title,
      durationHours: d.durationHours === '' ? null : Number(d.durationHours),
      participantCount: d.participantCount === '' ? null : Number(d.participantCount),
      description: normalizeMultiline(d.description),
      status: d.status,
    })
    showEdit.value = false
    toast('教学记录已更新')
    await loadRecords()
  } catch (e) {
    toast(e?.response?.data?.error || '更新失败，请稍后重试', 'error')
  }
}

async function handleDelete(record) {
  if (!window.confirm(`确认删除「${record.title}」这条教学记录？`)) return
  try {
    await deleteTeachingRecord(record.id)
    toast('教学记录已删除', 'info')
    await loadRecords()
  } catch (e) {
    toast(e?.response?.data?.error || '删除失败，请稍后重试', 'error')
  }
}
</script>

<style scoped>
/* 活动说明是多行文本，保留换行与段落空行 */
.multiline-text {
  display: inline-block;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
