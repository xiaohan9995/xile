<template>
  <div>
    <div class="page-head"><div><h1>服务记录</h1><p>查看、修改或删除教师提交的服务与推广活动；记录可作为年审佐证材料。</p></div></div>
    <div class="toolbar">
      <input v-model="filters.teacherName" placeholder="教师姓名或喜乐名" />
      <input v-model="filters.serviceType" placeholder="服务类型" />
      <select v-model="filters.status"><option value="">全部状态</option><option value="submitted">已提交</option><option value="draft">草稿</option></select>
    </div>
    <div class="data-table-wrap roster-wrap"><table class="data-table roster-table">
      <thead><tr><th>教师</th><th>服务日期</th><th>服务类型 / 活动</th><th>地点</th><th>状态</th><th>佐证</th><th>操作</th></tr></thead>
      <tbody><tr v-if="!pagedRecords.length"><td colspan="7" class="empty-cell">暂无符合筛选条件的服务记录</td></tr>
      <tr v-for="record in pagedRecords" :key="record.id"><td><strong>{{ record.teacherName }}</strong><br><small>{{ record.xileName || '—' }} · {{ record.certificateNo || '未认证' }}</small></td><td>{{ record.servedOn }}</td><td><strong>{{ record.title }}</strong><br><small>{{ record.serviceType }}</small><br><small v-if="record.description">{{ record.description }}</small></td><td>{{ record.location || '—' }}</td><td><span class="status-tag" :class="record.status === 'submitted' ? 'status-active' : ''">{{ record.status === 'submitted' ? '已提交' : '草稿' }}</span></td><td><a v-if="record.evidenceUrl" :href="record.evidenceUrl" target="_blank" rel="noopener" class="table-action">查看附件</a><span v-else>—</span></td><td class="table-actions"><button class="table-action" @click="openEdit(record)">编辑</button><button class="danger-action" @click="handleDelete(record)">删除</button></td></tr></tbody>
    </table><Pagination v-model:current-page="currentPage" :total-pages="totalPages" :total-items="filteredRecords.length" /></div>

    <!-- Edit Modal -->
    <div v-if="showEdit" class="modal-backdrop" @click.self="showEdit = false">
      <form class="admin-modal" @submit.prevent="handleUpdate">
        <div class="modal-head">
          <h2>编辑服务记录</h2>
          <button type="button" @click="showEdit = false">×</button>
        </div>
        <label><span class="field-label">服务日期 <em>*</em></span><input v-model="editDraft.servedOn" type="date" required /></label>
        <label><span class="field-label">服务类型 <em>*</em></span><input v-model="editDraft.serviceType" required /></label>
        <label><span class="field-label">活动名称 <em>*</em></span><input v-model="editDraft.title" required /></label>
        <label>服务地点<input v-model="editDraft.location" /></label>
        <label>服务说明<textarea v-model="editDraft.description"></textarea></label>
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
import { fetchAdminServiceRecords, updateServiceRecord, deleteServiceRecord } from '../api/adminData'
import Pagination from '../components/Pagination.vue'
import { useToast } from '../composables/useToast'

const { show: toast } = useToast()
const records = ref([])
const filters = ref({ teacherName: '', serviceType: '', status: '' })
const currentPage = ref(1)
const pageSize = 15
const showEdit = ref(false)
const editDraft = ref({ id: null, servedOn: '', serviceType: '', title: '', location: '', description: '', status: 'submitted' })

async function loadRecords() {
  try { records.value = await fetchAdminServiceRecords() } catch (_) { toast('服务记录加载失败', 'error') }
}
onMounted(loadRecords)

const filteredRecords = computed(() => { const match = (v, q) => !q || String(v || '').toLowerCase().includes(q); const teacher = filters.value.teacherName.trim().toLowerCase(); const type = filters.value.serviceType.trim().toLowerCase(); return records.value.filter((i) => match(`${i.teacherName || ''}${i.xileName || ''}`, teacher) && match(i.serviceType, type) && (!filters.value.status || i.status === filters.value.status)) })
const totalPages = computed(() => Math.ceil(filteredRecords.value.length / pageSize))
const pagedRecords = computed(() => filteredRecords.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
watch(filters, () => { currentPage.value = 1 }, { deep: true })

function toDateInput(value) {
  return String(value || '').replace(/\./g, '-').slice(0, 10)
}

function openEdit(record) {
  editDraft.value = {
    id: record.id,
    servedOn: toDateInput(record.servedOn),
    serviceType: record.serviceType || '',
    title: record.title || '',
    location: record.location || '',
    description: record.description || '',
    status: record.status || 'submitted',
  }
  showEdit.value = true
}

async function handleUpdate() {
  const d = editDraft.value
  if (!d.servedOn || !d.serviceType.trim() || !d.title.trim()) {
    toast('请填写日期、服务类型和活动名称', 'error')
    return
  }
  try {
    await updateServiceRecord(d.id, {
      servedOn: d.servedOn,
      serviceType: d.serviceType,
      title: d.title,
      location: d.location,
      description: d.description,
      status: d.status,
    })
    showEdit.value = false
    toast('服务记录已更新')
    await loadRecords()
  } catch (e) {
    toast(e?.response?.data?.error || '更新失败，请稍后重试', 'error')
  }
}

async function handleDelete(record) {
  if (!window.confirm(`确认删除「${record.title}」这条服务记录？`)) return
  try {
    await deleteServiceRecord(record.id)
    toast('服务记录已删除', 'info')
    await loadRecords()
  } catch (e) {
    toast(e?.response?.data?.error || '删除失败，请稍后重试', 'error')
  }
}
</script>
