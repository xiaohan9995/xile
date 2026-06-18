<template>
  <div>
    <div class="page-head">
      <div>
        <h1>教师管理 roster</h1>
        <p>系统已签发电子证书名录。支持创建新导师及强制吊销其电子章权。</p>
      </div>
      <button class="primary-btn" @click="showCreate = true">＋ 添加新登记导师</button>
    </div>

    <div class="admin-searchline">
      <span>⌕</span>
      <input v-model="keyword" placeholder="搜索系统中认证的教师名字、证书编号..." />
    </div>

    <div class="data-table-wrap roster-wrap">
      <table class="data-table roster-table">
        <thead>
          <tr>
            <th>名师头像 & 姓名</th>
            <th>认证等级</th>
            <th>防伪证书编号</th>
            <th>有效期限</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="teacher in filteredRoster" :key="teacher.certNo">
            <td>
              <div class="cell-person compact">
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
            <td><button class="icon-danger" aria-label="吊销证书" @click="removeTeacher(teacher.certNo)">⌧</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <form class="admin-modal" @submit.prevent="createTeacher">
        <div class="modal-head">
          <h2>添加新登记导师</h2>
          <button type="button" @click="showCreate = false">×</button>
        </div>
        <label>
          姓名
          <input v-model="draft.name" required placeholder="例如：刘一" />
        </label>
        <label>
          手机
          <input v-model="draft.phone" required placeholder="138-0000-0000" />
        </label>
        <label>
          认证等级
          <select v-model="draft.level">
            <option>L1见习导师</option>
            <option>L2认证导师</option>
            <option>L3认证导师</option>
            <option>L4高级导师</option>
          </select>
        </label>
        <label>
          有效期限
          <input v-model="draft.expiryDate" required placeholder="2028.12.31" />
        </label>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showCreate = false">取消</button>
          <button class="primary-btn">确认添加</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchAdminTeachers } from '../api/adminData.js'

const route = useRoute()
const keyword = ref('')
const showCreate = ref(route.query.create === '1')
const draft = reactive({
  name: '',
  phone: '',
  level: 'L2认证导师',
  expiryDate: '2028.12.31',
})

const roster = ref([
  {
    name: '张三',
    level: 'L2认证导师',
    certNo: 'JY20230001',
    expiryDate: '2028.12.31',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    phone: '138-8888-0001',
  },
  {
    name: '李四',
    level: 'L2认证导师',
    certNo: 'JY20230002',
    expiryDate: '2028.12.31',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=200&auto=format&fit=crop',
    phone: '139-9999-0002',
  },
  {
    name: '张五',
    level: 'L2认证导师',
    certNo: 'JY20230003',
    expiryDate: '2028.12.31',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    phone: '136-6666-0003',
  },
  {
    name: '海六',
    level: 'L3认证导师',
    certNo: 'JY20230004',
    expiryDate: '2028.12.31',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    phone: '135-5555-0004',
  },
  {
    name: '张六',
    level: 'L3认证导师',
    certNo: 'JY20230005',
    expiryDate: '2028.12.31',
    avatar: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=200&auto=format&fit=crop',
    phone: '137-7777-0005',
  },
  {
    name: '畅琦',
    level: 'L3认证导师',
    certNo: 'JY20230006',
    expiryDate: '2028.12.31',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop',
    phone: '186-6666-8888',
  },
])

onMounted(async () => {
  try {
    roster.value = await fetchAdminTeachers()
  } catch (error) {
    console.warn('教师名录接口暂不可用，保留本地演示数据', error)
  }
})

const filteredRoster = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return roster.value
  return roster.value.filter((teacher) => [teacher.name, teacher.certNo, teacher.phone, teacher.level].some((field) => field.toLowerCase().includes(text)))
})

function createTeacher() {
  const nextNo = `JY${new Date().getFullYear()}${String(roster.value.length + 1).padStart(4, '0')}`
  roster.value.unshift({
    name: draft.name,
    level: draft.level,
    certNo: nextNo,
    expiryDate: draft.expiryDate,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    phone: draft.phone,
  })
  draft.name = ''
  draft.phone = ''
  draft.level = 'L2认证导师'
  draft.expiryDate = '2028.12.31'
  showCreate.value = false
}

function removeTeacher(certNo) {
  if (!window.confirm('确认吊销该导师证书并从名录移除？')) return
  roster.value = roster.value.filter((teacher) => teacher.certNo !== certNo)
}
</script>
