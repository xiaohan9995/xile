<template>
  <div>
    <div class="page-head">
      <div>
        <h1>教师管理</h1>
      </div>
      <button class="primary-btn" @click="showCreate = true">新增教师</button>
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
            <th>有效期至</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="teacher in filteredList" :key="teacher.id">
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
            <td>{{ teacher.expiryDate }}</td>
            <td>
              <button class="icon-danger" @click="handleDelete(teacher)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <form class="admin-modal" @submit.prevent="handleCreate">
        <div class="modal-head">
          <h2>新增教师</h2>
          <button type="button" @click="showCreate = false">×</button>
        </div>
        <label>
          姓名
          <input v-model="draft.name" required placeholder="请输入姓名" />
        </label>
        <label>
          手机
          <input v-model="draft.phone" placeholder="请输入手机号" />
        </label>
        <label>
          等级
          <select v-model="draft.level">
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
            <option value="L4">L4</option>
          </select>
        </label>
        <label>
          城市
          <input v-model="draft.city" placeholder="请输入城市" />
        </label>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showCreate = false">取消</button>
          <button type="submit" class="primary-btn">确认添加</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchAdminTeachers, createTeacher, deleteTeacher } from '../api/adminData'

const keyword = ref('')
const showCreate = ref(false)
const teachers = ref([])

const draft = reactive({
  name: '',
  phone: '',
  level: 'L2',
  city: '',
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
    [t.name, t.certNo, t.phone].some((field) => (field || '').toLowerCase().includes(text))
  )
})

async function handleCreate() {
  await createTeacher({
    name: draft.name,
    phone: draft.phone,
    level: draft.level,
    city: draft.city,
  })
  draft.name = ''
  draft.phone = ''
  draft.level = 'L2'
  draft.city = ''
  showCreate.value = false
  await loadTeachers()
}

async function handleDelete(teacher) {
  if (!window.confirm(`确认删除教师「${teacher.name}」？`)) return
  await deleteTeacher(teacher.id)
  await loadTeachers()
}
</script>

<style scoped>
</style>
