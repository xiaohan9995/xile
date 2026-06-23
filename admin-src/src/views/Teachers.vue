<template>
  <div>
    <div class="page-head">
      <div>
        <h1>教师管理</h1>
      </div>
      <button class="primary-btn" @click="openCreate">＋ 新增教师</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" placeholder="搜索姓名、证书编号、手机号..." />
    </div>

    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>教师信息</th>
            <th>认证等级</th>
            <th>证书编号</th>
            <th>城市</th>
            <th>有效期至</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pagedList.length === 0">
            <td colspan="6" class="empty-row">{{ keyword ? '无匹配结果，请调整搜索条件' : '暂无教师数据' }}</td>
          </tr>
          <tr v-for="teacher in pagedList" :key="teacher.id">
            <td>
              <div class="cell-person">
                <img :src="teacher.avatar" :alt="teacher.name" />
                <div>
                  <strong>{{ teacher.name }}</strong>
                  <span>{{ teacher.phone }}</span>
                </div>
              </div>
            </td>
            <td><span class="level-text">{{ teacher.level }}</span></td>
            <td><strong class="mono-cert">{{ teacher.certNo }}</strong></td>
            <td>{{ teacher.city || '—' }}</td>
            <td>{{ teacher.expiryDate }}</td>
            <td>
              <button class="table-action" @click="openEdit(teacher)">编辑</button>
              <button class="icon-danger" @click="handleDelete(teacher)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="totalPages > 1" class="pagination">
        <button class="pagination-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
        <button
          v-for="p in displayPages"
          :key="p"
          class="pagination-btn"
          :class="{ 'pagination-btn--active': p === currentPage }"
          @click="currentPage = p"
        >{{ p }}</button>
        <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
        <span class="pagination-info">共 {{ filteredList.length }} 条</span>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <form class="admin-modal" @submit.prevent="handleCreate">
        <div class="modal-head">
          <h2>新增教师</h2>
          <button type="button" @click="showCreate = false">×</button>
        </div>
        <div class="form-grid two">
          <label>
            姓名 <em>*</em>
            <input v-model="createDraft.name" required placeholder="请输入姓名" />
          </label>
          <label>
            喜乐名
            <input v-model="createDraft.xileName" placeholder="请输入喜乐名" />
          </label>
          <label>
            手机号
            <input v-model="createDraft.phone" placeholder="请输入手机号" />
          </label>
          <label>
            等级
            <select v-model="createDraft.level">
              <option value="L0">L0</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="L4">L4</option>
              <option value="L5">L5</option>
            </select>
          </label>
          <label>
            城市
            <input v-model="createDraft.city" placeholder="请输入城市" />
          </label>
          <label>
            地区
            <input v-model="createDraft.district" placeholder="请输入区/县" />
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showCreate = false">取消</button>
          <button type="submit" class="primary-btn">确认添加</button>
        </div>
      </form>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEdit" class="modal-backdrop" @click.self="showEdit = false">
      <form class="admin-modal" @submit.prevent="handleUpdate">
        <div class="modal-head">
          <h2>编辑教师 — {{ editDraft.certNo }}</h2>
          <button type="button" @click="showEdit = false">×</button>
        </div>
        <div class="form-grid two">
          <label>
            姓名 <em>*</em>
            <input v-model="editDraft.name" required />
          </label>
          <label>
            喜乐名
            <input v-model="editDraft.xileName" placeholder="喜乐名" />
          </label>
          <label>
            手机号
            <input v-model="editDraft.phone" placeholder="手机号" />
          </label>
          <label>
            城市
            <input v-model="editDraft.city" placeholder="城市" />
          </label>
          <label>
            地区
            <input v-model="editDraft.district" placeholder="区/县" />
          </label>
          <label>
            管委会备注
            <input v-model="editDraft.committeeRemark" placeholder="仅管委会可见" />
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showEdit = false">取消</button>
          <button type="submit" class="primary-btn">保存修改</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { fetchAdminTeachers, createTeacher, updateTeacher, deleteTeacher } from '../api/adminData'
import { useToast } from '../composables/useToast'

const { show: toast } = useToast()

const keyword = ref('')
const showCreate = ref(false)
const showEdit = ref(false)
const teachers = ref([])
const currentPage = ref(1)
const pageSize = 15

const createDraft = reactive({
  name: '',
  xileName: '',
  phone: '',
  level: 'L2',
  city: '',
  district: '',
})

const editDraft = reactive({
  id: null,
  certNo: '',
  name: '',
  xileName: '',
  phone: '',
  city: '',
  district: '',
  committeeRemark: '',
})

async function loadTeachers() {
  try {
    teachers.value = await fetchAdminTeachers()
  } catch (e) {
    console.warn('获取教师列表失败', e)
  }
}

onMounted(loadTeachers)

const filteredList = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return teachers.value
  return teachers.value.filter((t) =>
    [t.name, t.certNo, t.phone, t.city].some((field) => (field || '').toLowerCase().includes(text))
  )
})

const totalPages = computed(() => Math.ceil(filteredList.value.length / pageSize))

const displayPages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  const pages = []
  const start = Math.max(1, cur - 2)
  const end = Math.min(total, cur + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredList.value.slice(start, start + pageSize)
})

watch(keyword, () => { currentPage.value = 1 })

function openCreate() {
  createDraft.name = ''
  createDraft.xileName = ''
  createDraft.phone = ''
  createDraft.level = 'L2'
  createDraft.city = ''
  createDraft.district = ''
  showCreate.value = true
}

function openEdit(teacher) {
  editDraft.id = teacher.id
  editDraft.certNo = teacher.certNo
  editDraft.name = teacher.name
  editDraft.xileName = teacher.xileName || ''
  editDraft.phone = teacher.phone === '未登记' ? '' : (teacher.phone || '')
  editDraft.city = teacher.city || ''
  editDraft.district = teacher.district || ''
  editDraft.committeeRemark = teacher.committeeRemark || ''
  showEdit.value = true
}

async function handleCreate() {
  await createTeacher({
    name: createDraft.name,
    xileName: createDraft.xileName,
    phone: createDraft.phone,
    level: createDraft.level,
    city: createDraft.city,
    district: createDraft.district,
  })
  showCreate.value = false
  toast('教师添加成功')
  await loadTeachers()
}

async function handleUpdate() {
  await updateTeacher(editDraft.id, {
    name: editDraft.name,
    xileName: editDraft.xileName,
    phone: editDraft.phone,
    city: editDraft.city,
    district: editDraft.district,
    committeeRemark: editDraft.committeeRemark,
  })
  showEdit.value = false
  toast('教师信息已更新')
  await loadTeachers()
}

async function handleDelete(teacher) {
  if (!window.confirm(`确认删除教师「${teacher.name}」？`)) return
  await deleteTeacher(teacher.id)
  toast('教师已删除', 'info')
  await loadTeachers()
}
</script>

<style scoped>
</style>
