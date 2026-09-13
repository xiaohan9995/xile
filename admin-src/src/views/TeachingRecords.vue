<template>
  <div>
    <div class="page-head">
      <div><h1>教学记录</h1><p>查看教师提交的教学活动；记录仅供查阅，年审时可作为佐证材料。</p></div>
    </div>
    <div class="toolbar">
      <input v-model="filters.teacherName" placeholder="教师姓名或喜乐名" />
      <input v-model="filters.platform" placeholder="教学平台" />
      <select v-model="filters.status"><option value="">全部状态</option><option value="submitted">已提交</option><option value="draft">草稿</option></select>
    </div>
    <div class="data-table-wrap roster-wrap">
      <table class="data-table roster-table">
        <thead><tr><th>教师</th><th>教学日期</th><th>平台 / 活动</th><th>时长 / 人数</th><th>状态</th><th>佐证</th></tr></thead>
        <tbody>
          <tr v-if="!pagedRecords.length"><td colspan="6" class="empty-cell">暂无符合筛选条件的教学记录</td></tr>
          <tr v-for="record in pagedRecords" :key="record.id">
            <td><strong>{{ record.teacherName }}</strong><br><small>{{ record.xileName || '—' }} · {{ record.certificateNo || '未认证' }}</small></td>
            <td>{{ record.taughtOn }}</td>
            <td><strong>{{ record.title }}</strong><br><small>{{ record.platform }}</small><br><small v-if="record.description">{{ record.description }}</small></td>
            <td>{{ record.durationHours || '—' }} 小时 / {{ record.participantCount || '—' }} 人</td>
            <td><span class="status-tag" :class="record.status === 'submitted' ? 'status-active' : ''">{{ record.status === 'submitted' ? '已提交' : '草稿' }}</span></td>
            <td><a v-if="record.evidenceUrl" :href="record.evidenceUrl" target="_blank" rel="noopener" class="table-action">查看附件</a><span v-else>—</span></td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:current-page="currentPage" :total-pages="totalPages" :total-items="filteredRecords.length" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { fetchAdminTeachingRecords } from '../api/adminData'
import Pagination from '../components/Pagination.vue'
import { useToast } from '../composables/useToast'

const { show: toast } = useToast()
const records = ref([])
const filters = ref({ teacherName: '', platform: '', status: '' })
const currentPage = ref(1)
const pageSize = 15
onMounted(async () => { try { records.value = await fetchAdminTeachingRecords() } catch (_) { toast('教学记录加载失败', 'error') } })
const filteredRecords = computed(() => {
  const match = (value, query) => !query || String(value || '').toLowerCase().includes(query)
  const teacher = filters.value.teacherName.trim().toLowerCase()
  const platform = filters.value.platform.trim().toLowerCase()
  return records.value.filter((item) => match(`${item.teacherName || ''}${item.xileName || ''}`, teacher) && match(item.platform, platform) && (!filters.value.status || item.status === filters.value.status))
})
const totalPages = computed(() => Math.ceil(filteredRecords.value.length / pageSize))
const pagedRecords = computed(() => filteredRecords.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
watch(filters, () => { currentPage.value = 1 }, { deep: true })
</script>
