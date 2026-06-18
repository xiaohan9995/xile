<template>
  <div>
    <div class="page-head">
      <div>
        <h1>工作室管理</h1>
      </div>
      <button class="primary-btn" @click="showCreate = true">新增工作室</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" placeholder="搜索名称、城市、地址、标签..." />
    </div>

    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>工作室</th>
            <th>城市</th>
            <th>地址</th>
            <th>联系方式</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="studio in filteredList" :key="studio.id">
            <td>
              <div class="studio-cell">
                <img :src="studio.image" :alt="studio.name" />
                <div>
                  <strong>{{ studio.name }}</strong>
                  <span>{{ Array.isArray(studio.tags) ? studio.tags.join(', ') : studio.tags }}</span>
                </div>
              </div>
            </td>
            <td>{{ studio.city }}</td>
            <td>{{ studio.address }}</td>
            <td>{{ studio.contact }}</td>
            <td><span class="status-pill">{{ studio.status || '正常' }}</span></td>
            <td>
              <button class="icon-danger" @click="handleDelete(studio)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <form class="admin-modal wide" @submit.prevent="handleCreate">
        <div class="modal-head">
          <h2>新增工作室</h2>
          <button type="button" @click="showCreate = false">×</button>
        </div>
        <div class="form-grid two">
          <label>
            名称
            <input v-model="draft.name" required placeholder="请输入工作室名称" />
          </label>
          <label>
            城市
            <input v-model="draft.city" required placeholder="请输入城市" />
          </label>
          <label>
            联系方式
            <input v-model="draft.contact" required placeholder="请输入联系方式" />
          </label>
          <label>
            标签
            <input v-model="draft.tags" placeholder="多个标签用逗号分隔" />
          </label>
        </div>
        <label>
          地址
          <input v-model="draft.address" placeholder="请输入详细地址" />
        </label>
        <label>
          简介
          <input v-model="draft.intro" placeholder="请输入工作室简介" />
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
import { fetchAdminStudios, createStudio, deleteStudio } from '../api/adminData'

const keyword = ref('')
const showCreate = ref(false)
const studios = ref([])

const draft = reactive({
  name: '',
  city: '',
  contact: '',
  tags: '',
  address: '',
  intro: '',
})

async function loadStudios() {
  try {
    studios.value = await fetchAdminStudios()
  } catch (e) {
    console.warn('获取工作室列表失败', e)
  }
}

onMounted(loadStudios)

const filteredList = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return studios.value
  return studios.value.filter((s) => {
    const tagsStr = Array.isArray(s.tags) ? s.tags.join(' ') : (s.tags || '')
    return [s.name, s.city, s.address, tagsStr].some((field) => (field || '').toLowerCase().includes(text))
  })
})

async function handleCreate() {
  await createStudio({
    name: draft.name,
    city: draft.city,
    contact: draft.contact,
    tags: draft.tags,
    address: draft.address,
    intro: draft.intro,
  })
  draft.name = ''
  draft.city = ''
  draft.contact = ''
  draft.tags = ''
  draft.address = ''
  draft.intro = ''
  showCreate.value = false
  await loadStudios()
}

async function handleDelete(studio) {
  if (!window.confirm(`确认删除工作室「${studio.name}」？`)) return
  await deleteStudio(studio.id)
  await loadStudios()
}
</script>

<style scoped>
</style>
