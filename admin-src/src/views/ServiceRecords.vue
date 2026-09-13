<template>
  <div>
    <div class="page-head"><div><h1>服务记录</h1><p>查看教师提交的服务与推广活动；记录仅供查阅，年审时可作为佐证材料。</p></div></div>
    <div class="toolbar">
      <input v-model="filters.teacherName" placeholder="教师姓名或喜乐名" />
      <input v-model="filters.serviceType" placeholder="服务类型" />
      <select v-model="filters.status"><option value="">全部状态</option><option value="submitted">已提交</option><option value="draft">草稿</option></select>
    </div>
    <div class="data-table-wrap roster-wrap"><table class="data-table roster-table">
      <thead><tr><th>教师</th><th>服务日期</th><th>服务类型 / 活动</th><th>地点</th><th>状态</th><th>佐证</th></tr></thead>
      <tbody><tr v-if="!pagedRecords.length"><td colspan="6" class="empty-cell">暂无符合筛选条件的服务记录</td></tr>
      <tr v-for="record in pagedRecords" :key="record.id"><td><strong>{{ record.teacherName }}</strong><br><small>{{ record.xileName || '—' }} · {{ record.certificateNo || '未认证' }}</small></td><td>{{ record.servedOn }}</td><td><strong>{{ record.title }}</strong><br><small>{{ record.serviceType }}</small><br><small v-if="record.description">{{ record.description }}</small></td><td>{{ record.location || '—' }}</td><td><span class="status-tag" :class="record.status === 'submitted' ? 'status-active' : ''">{{ record.status === 'submitted' ? '已提交' : '草稿' }}</span></td><td><a v-if="record.evidenceUrl" :href="record.evidenceUrl" target="_blank" rel="noopener" class="table-action">查看附件</a><span v-else>—</span></td></tr></tbody>
    </table><Pagination v-model:current-page="currentPage" :total-pages="totalPages" :total-items="filteredRecords.length" /></div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { fetchAdminServiceRecords } from '../api/adminData'
import Pagination from '../components/Pagination.vue'
import { useToast } from '../composables/useToast'
const { show: toast } = useToast(); const records = ref([]); const filters = ref({ teacherName: '', serviceType: '', status: '' }); const currentPage = ref(1); const pageSize = 15
onMounted(async () => { try { records.value = await fetchAdminServiceRecords() } catch (_) { toast('服务记录加载失败', 'error') } })
const filteredRecords = computed(() => { const match = (v, q) => !q || String(v || '').toLowerCase().includes(q); const teacher = filters.value.teacherName.trim().toLowerCase(); const type = filters.value.serviceType.trim().toLowerCase(); return records.value.filter((i) => match(`${i.teacherName || ''}${i.xileName || ''}`, teacher) && match(i.serviceType, type) && (!filters.value.status || i.status === filters.value.status)) })
const totalPages = computed(() => Math.ceil(filteredRecords.value.length / pageSize)); const pagedRecords = computed(() => filteredRecords.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)); watch(filters, () => { currentPage.value = 1 }, { deep: true })
</script>
