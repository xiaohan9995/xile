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
            <td class="table-actions">
              <button class="table-action" @click="openEdit(teacher)">编辑</button>
              <button class="table-action table-action--primary" @click="generateLinkCode(teacher)">生成关联码</button>
              <button class="table-action" @click="openAccount(teacher)">设置密码</button>
              <button class="danger-action" @click="handleDelete(teacher)">删除</button>
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
            <span class="field-label">姓名 <em>*</em></span>
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
      <form class="admin-modal admin-modal--edit" @submit.prevent="handleUpdate">
        <div class="modal-head">
          <h2>编辑教师 — {{ editDraft.certNo }}</h2>
          <button type="button" @click="showEdit = false">×</button>
        </div>
        <div class="form-grid two">
          <label>
            <span class="field-label">姓名 <em>*</em></span>
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
          <label>
            教师头像
            <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadTeacherAsset($event, 'teacher-avatar', 'avatarUrl')" />
            <img v-if="editDraft.avatarUrl" class="asset-preview" :src="editDraft.avatarUrl" alt="教师头像预览" />
          </label>
          <label>
            认证证书图片
            <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadTeacherAsset($event, 'teacher-certificate', 'certificateUrl')" />
            <img v-if="editDraft.certificateUrl" class="asset-preview asset-preview--certificate" :src="editDraft.certificateUrl" alt="认证证书预览" />
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showEdit = false">取消</button>
          <button type="submit" class="primary-btn">保存修改</button>
        </div>
      </form>
    </div>
    <!-- Account Modal -->
    <div v-if="showAccount" class="modal-backdrop" @click.self="showAccount = false">
      <form class="admin-modal" @submit.prevent="handleAssignAccount">
        <div class="modal-head">
          <h2>设置教师密码 — {{ accountDraft.name }}</h2>
          <button type="button" @click="showAccount = false">×</button>
        </div>
        <div class="form-grid two">
          <label>
            <span class="field-label">登录用户名 <em>*</em></span>
            <input v-model="accountDraft.username" required placeholder="教师在小程序登录用的用户名" />
          </label>
          <label>
            <span class="field-label">初始密码 <em>*</em></span>
            <span class="account-password-row">
              <input v-model="accountDraft.password" required minlength="8" placeholder="至少 8 位" />
              <button type="button" class="sync-btn" @click="regenPassword">换一个</button>
            </span>
          </label>
        </div>
        <p class="account-hint">
          微信登录后，建议优先使用「我的 → 关联教师身份」输入管理员生成的关联码。
          此处仅为需要账号密码登录的教师设置兼容密码；重复设置将重置密码。
        </p>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showAccount = false">取消</button>
          <button type="submit" class="primary-btn">确认分配</button>
        </div>
      </form>
    </div>
    <!-- Link Code Modal -->
    <div v-if="showLinkCode" class="modal-backdrop" @click.self="showLinkCode = false">
      <div class="admin-modal link-code-modal">
        <div class="modal-head">
          <h2>关联教师身份 — {{ linkCodeDraft.name }}</h2>
          <button type="button" @click="showLinkCode = false">×</button>
        </div>
        <p class="account-hint">请让教师先在小程序使用微信登录，再在「我的 → 关联教师身份」中输入此码。生成新码会使旧码失效。</p>
        <div class="link-code-value">{{ linkCodeDraft.code }}</div>
        <p class="link-code-expiry">有效期至：{{ linkCodeDraft.expiresAt }}</p>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="copyLinkCode">复制关联码</button>
          <button type="button" class="primary-btn" @click="showLinkCode = false">完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { fetchAdminTeachers, createTeacher, updateTeacher, deleteTeacher, createTeacherAccount, createTeacherLinkCode, uploadAdminAsset } from '../api/adminData'
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
  avatarUrl: '',
  certificateUrl: '',
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
  editDraft.avatarUrl = teacher.avatarUrl || ''
  editDraft.certificateUrl = teacher.certificateUrl || ''
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
    avatarUrl: editDraft.avatarUrl,
    certificateUrl: editDraft.certificateUrl,
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

const showAccount = ref(false)
const showLinkCode = ref(false)
const accountDraft = reactive({ teacherId: null, name: '', username: '', password: '' })
const linkCodeDraft = reactive({ name: '', code: '', expiresAt: '' })

function formatLinkCodeExpiry(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(/\//g, '-')
}

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

function openAccount(teacher) {
  accountDraft.teacherId = teacher.id
  accountDraft.name = teacher.name
  accountDraft.username = ''
  accountDraft.password = genPassword()
  showAccount.value = true
}

function regenPassword() {
  accountDraft.password = genPassword()
}

async function handleAssignAccount() {
  const username = accountDraft.username.trim()
  try {
    await createTeacherAccount({
      teacherId: accountDraft.teacherId,
      username,
      password: accountDraft.password,
    })
    showAccount.value = false
    toast(`账号已分配：${username} / ${accountDraft.password}，请及时告知教师`)
  } catch (e) {
    const message = e?.response?.data?.error || e?.message || '分配失败，请重试'
    toast(message, 'info')
  }
}

async function generateLinkCode(teacher) {
  try {
    const result = await createTeacherLinkCode(teacher.id)
    linkCodeDraft.name = teacher.name
    linkCodeDraft.code = result.code
    linkCodeDraft.expiresAt = formatLinkCodeExpiry(result.expiresAt)
    showLinkCode.value = true
  } catch (e) {
    toast(e?.response?.data?.error || e?.message || '关联码生成失败，请重试', 'info')
  }
}

async function copyLinkCode() {
  try {
    await navigator.clipboard.writeText(linkCodeDraft.code)
    toast('关联码已复制')
  } catch (e) {
    toast(`请手动复制：${linkCodeDraft.code}`, 'info')
  }
}

async function uploadTeacherAsset(event, assetType, targetField) {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  try {
    const result = await uploadAdminAsset(file, assetType)
    editDraft[targetField] = result.url
    toast('图片已上传到对象存储')
  } catch (e) {
    const message = e?.response?.data?.error || e?.message || '图片上传失败，请检查对象存储配置'
    toast(message === 'image too large, max 8MB' ? '图片大小不能超过 8MB' : message, 'error')
  } finally {
    event.target.value = ''
  }
}
</script>

<style scoped>
.account-password-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.account-password-row input {
  flex: 1;
}

.account-hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #8a9386;
}

.table-action--primary {
  color: #356c4e;
  font-weight: 600;
}

.link-code-value {
  margin: 22px 0 8px;
  padding: 18px;
  border-radius: 10px;
  background: #f2f7f2;
  color: #284b36;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 4px;
  text-align: center;
}

.link-code-expiry {
  color: #8a9386;
  font-size: 12px;
  text-align: center;
}

.asset-preview {
  display: block;
  width: 56px;
  height: 56px;
  margin-top: 8px;
  border: 1px solid #e3e9e3;
  border-radius: 8px;
  object-fit: cover;
}

.asset-preview--certificate {
  width: 96px;
  object-fit: contain;
}
</style>
