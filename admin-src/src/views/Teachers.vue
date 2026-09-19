<template>
  <div>
    <div class="page-head">
      <div>
        <h1>教师管理</h1>
      </div>
      <div class="page-head-actions">
        <button class="refresh-btn" :class="{ 'is-spinning': refreshing }" :disabled="refreshing" @click="refresh">
          <span class="refresh-icon">↻</span>{{ refreshing ? '刷新中…' : '刷新' }}
        </button>
        <button class="primary-btn" @click="openCreate">＋ 新增教师</button>
      </div>
    </div>

    <div class="toolbar">
      <input v-model="filters.name" placeholder="姓名" />
      <input v-model="filters.xileName" placeholder="喜乐名" />
      <input v-model="filters.certNo" placeholder="证书编号" />
      <input v-model="filters.city" placeholder="城市" />
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
            <td colspan="6" class="empty-row">{{ hasFilters ? '无匹配结果，请调整筛选条件' : '暂无教师数据' }}</td>
          </tr>
          <tr v-for="teacher in pagedList" :key="teacher.id">
            <td>
              <div class="cell-person">
                <ImagePreview v-if="teacher.avatar" :src="teacher.avatar" :alt="teacher.name" image-class="teacher-avatar" @error="teacher.avatar = ''" />
                <div v-else class="teacher-avatar-fallback">{{ (teacher.name || '教').slice(0, 1) }}</div>
                <div>
                  <strong>{{ teacher.name }}</strong>
                  <span>{{ teacher.xileName || '—' }}</span>
                </div>
              </div>
            </td>
            <td><span class="level-text">{{ teacher.level }}</span></td>
            <td><strong class="mono-cert">{{ teacher.certNo }}</strong></td>
            <td>{{ teacher.city || '—' }}</td>
            <td>{{ teacher.expiryDate }}</td>
            <td class="table-actions">
              <button class="table-action" @click="openEdit(teacher)">编辑</button>
              <button class="table-action" @click="openAccount(teacher)">设置密码</button>
              <button class="danger-action" @click="handleDelete(teacher)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
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
      <form class="admin-modal wide" @submit.prevent="handleCreate">
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
            身份证号
            <input v-model="createDraft.idNumber" placeholder="用于教师账号登录及初始密码" />
          </label>
          <label>
            证书编号
            <div class="cert-no-row">
              <input v-model="createDraft.certNo" placeholder="未认证教师留空" />
              <button type="button" class="cert-no-gen" @click="autoGenerateCertNo(createDraft)">自动生成</button>
            </div>
          </label>
          <label>
            等级
            <select v-model="createDraft.level">
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="L4">L4</option>
              <option value="L5">L5</option>
            </select>
          </label>
          <label>
            首次认证日期
            <input v-model="createDraft.certifiedAt" placeholder="如 2026-01-01" />
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
            别名
            <input v-model="editDraft.alias" placeholder="用于未设置喜乐名时的公开显示" />
          </label>
          <label>
            手机号
            <input v-model="editDraft.phone" placeholder="手机号" />
          </label>
          <label>
            身份证号
            <input v-model="editDraft.idNumber" placeholder="用于教师账号登录及初始密码" />
          </label>
          <label>
            证书编号
            <div class="cert-no-row">
              <input v-model="editDraft.certNo" placeholder="未认证教师留空" />
              <button type="button" class="cert-no-gen" @click="autoGenerateCertNo(editDraft)">自动生成</button>
            </div>
          </label>
          <label>
            首次认证日期
            <input v-model="editDraft.certifiedAt" placeholder="如 2026-01-01" />
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
            经常居住地
            <input v-model="editDraft.residencesText" placeholder="多个地区用逗号分隔" />
          </label>
          <label>
            当前等级认证时间
            <input v-model="editDraft.currentTierCertifiedOn" placeholder="如 2026-01-01" />
          </label>
          <label>
            管委会备注
            <input v-model="editDraft.committeeRemark" placeholder="仅管委会可见" />
          </label>
          <label class="field-full">
            个人简介
            <textarea v-model="editDraft.teachingSummary" placeholder="100 字以内" class="field-textarea"></textarea>
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
        <p class="account-hint">
          教师账号统一使用身份证号登录，初始密码为 <strong>身份证后六位</strong>。
          确认后会重置为该初始密码，教师首次登录必须修改密码；请先在教师档案填写身份证号。
        </p>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showAccount = false">取消</button>
          <button type="submit" class="primary-btn">确认分配</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import ImagePreview from '../components/ImagePreview.vue'
import { fetchAdminTeachers, createTeacher, updateTeacher, deleteTeacher, createTeacherAccount, uploadAdminAsset } from '../api/adminData'
import { useToast } from '../composables/useToast'
import { normalizeMultiline } from '../utils/text.js'

const { show: toast } = useToast()

const filters = ref({ name: '', xileName: '', certNo: '', city: '' })
const showCreate = ref(false)
const showEdit = ref(false)
const teachers = ref([])
const currentPage = ref(1)
const pageSize = 15

const createDraft = reactive({
  name: '',
  xileName: '',
  alias: '',
  idNumber: '',
  certNo: '',
  phone: '',
  level: 'L2',
  certifiedAt: '',
  city: '',
  district: '',
})

const editDraft = reactive({
  id: null,
  certNo: '',
  name: '',
  xileName: '',
  alias: '',
  idNumber: '',
  phone: '',
  level: 'L2',
  certifiedAt: '',
  city: '',
  district: '',
  committeeRemark: '',
  teachingSummary: '',
  avatarUrl: '',
  certificateUrl: '',
  residencesText: '',
  currentTierCertifiedOn: '',
})

async function loadTeachers() {
  try {
    teachers.value = await fetchAdminTeachers()
  } catch (e) {
    console.warn('获取教师列表失败', e)
    toast('教师列表加载失败，请稍后重试', 'error')
  }
}

const refreshing = ref(false)

async function refresh() {
  refreshing.value = true
  try {
    await loadTeachers()
  } finally {
    refreshing.value = false
  }
}

onMounted(loadTeachers)

const filteredList = computed(() => {
  const matches = (value, query) => !query || String(value || '').toLowerCase().includes(query)
  const name = filters.value.name.trim().toLowerCase()
  const xileName = filters.value.xileName.trim().toLowerCase()
  const certNo = filters.value.certNo.trim().toLowerCase()
  const city = filters.value.city.trim().toLowerCase()
  return teachers.value.filter((t) => matches(t.name, name) && matches(t.xileName, xileName) && matches(t.certNo, certNo) && matches(t.city, city))
})

const hasFilters = computed(() => Object.values(filters.value).some((value) => value.trim()))

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

watch(filters, () => { currentPage.value = 1 }, { deep: true })

function openCreate() {
  createDraft.name = ''
  createDraft.xileName = ''
  createDraft.idNumber = ''
  createDraft.certNo = ''
  createDraft.phone = ''
  createDraft.level = 'L2'
  createDraft.certifiedAt = ''
  createDraft.city = ''
  createDraft.district = ''
  showCreate.value = true
}

// 按「2050 + 级别 + XL + 首次认证年份 + 身份证后四位」生成证书号填入输入框。
// silent 模式用于「上传证书图片时自动生成」：信息不全时静默跳过，不打扰用户。
function autoGenerateCertNo(draft, silent = false) {
  const level = (draft.level || '').trim().toUpperCase()
  const year = (draft.certifiedAt || '').trim().slice(0, 4)
  const idNumber = (draft.idNumber || '').trim()
  const last4 = idNumber.slice(-4)
  if (!level || !/^\d{4}$/.test(year) || last4.length < 4) {
    if (!silent) toast('需先填写等级、首次认证日期（YYYY-MM-DD）和身份证号', 'error')
    return false
  }
  draft.certNo = `2050${level}XL${year}${last4}`
  return true
}

function openEdit(teacher) {
  editDraft.id = teacher.id
  editDraft.certNo = teacher.certNo
  editDraft.name = teacher.name
  editDraft.xileName = teacher.xileName || ''
  editDraft.alias = teacher.alias || ''
  editDraft.idNumber = teacher.idNumber || ''
  editDraft.phone = teacher.phone === '未登记' ? '' : (teacher.phone || '')
  editDraft.city = teacher.city || ''
  editDraft.district = teacher.district || ''
  editDraft.committeeRemark = teacher.committeeRemark || ''
  editDraft.teachingSummary = teacher.teachingSummary || ''
  editDraft.avatarUrl = teacher.avatarUrl || ''
  editDraft.certificateUrl = teacher.certificateUrl || ''
  editDraft.residencesText = Array.isArray(teacher.residences) ? teacher.residences.join(', ') : ''
  editDraft.currentTierCertifiedOn = teacher.currentTierCertifiedOn || ''
  editDraft.certifiedAt = teacher.certifiedAt || ''
  editDraft.level = teacher.tier || 'L2'
  showEdit.value = true
}

async function handleCreate() {
  await createTeacher({
    name: createDraft.name,
    xileName: createDraft.xileName,
    idNumber: createDraft.idNumber,
    certificateNo: createDraft.certNo,
    phone: createDraft.phone,
    level: createDraft.level,
    certifiedAt: createDraft.certifiedAt,
    city: createDraft.city,
    district: createDraft.district,
  })
  showCreate.value = false
  toast('教师添加成功')
  await loadTeachers()
}

async function handleUpdate() {
  const summary = normalizeMultiline(editDraft.teachingSummary)
  if (summary.length > 100) {
    toast(`个人简介最多 100 字，当前 ${summary.length} 字`, 'error')
    return
  }
  try {
    await updateTeacher(editDraft.id, {
      name: editDraft.name,
      xileName: editDraft.xileName,
      alias: editDraft.alias,
      idNumber: editDraft.idNumber,
      certificateNo: editDraft.certNo,
      phone: editDraft.phone,
      level: editDraft.level,
      certifiedAt: editDraft.certifiedAt,
      city: editDraft.city,
      district: editDraft.district,
      committeeRemark: editDraft.committeeRemark,
      teachingSummary: summary,
      avatarUrl: editDraft.avatarUrl,
      certificateUrl: editDraft.certificateUrl,
      residences: editDraft.residencesText.split(/[,，]/).map((item) => item.trim()).filter(Boolean),
      currentTierCertifiedOn: editDraft.currentTierCertifiedOn,
    })
  } catch (e) {
    toast(e?.response?.data?.error || '保存失败，请稍后重试', 'error')
    return
  }
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
const accountDraft = reactive({ teacherId: null, name: '' })

function openAccount(teacher) {
  accountDraft.teacherId = teacher.id
  accountDraft.name = teacher.name
  showAccount.value = true
}

async function handleAssignAccount() {
  try {
    const account = await createTeacherAccount({ teacherId: accountDraft.teacherId })
    showAccount.value = false
    toast(`账号：${account.username}；初始密码：${account.initialPassword}`)
  } catch (e) {
    const message = e?.response?.data?.error || e?.message || '分配失败，请重试'
    toast(message, 'info')
  }
}

async function uploadTeacherAsset(event, assetType, targetField) {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  const allowed = ['.jpg', '.jpeg', '.png', '.webp']
  const ext = (file.name || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || ''
  if (!allowed.includes(ext)) {
    toast(`「${file.name || '所选文件'}」格式不支持，仅支持 JPG、PNG 和 WebP 图片`, 'error')
    event.target.value = ''
    return
  }
  try {
    const result = await uploadAdminAsset(file, assetType)
    editDraft[targetField] = result.url
    // 上传证书图片时，若证书编号为空则按「级别+首次认证年份+身份证后四位」自动生成
    if (targetField === 'certificateUrl' && !editDraft.certNo) {
      autoGenerateCertNo(editDraft, true)
    }
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
.cert-no-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.cert-no-row input {
  flex: 1;
  min-width: 0;
}
.cert-no-gen {
  flex-shrink: 0;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--brand-green, #426d58);
  border-radius: 13px;
  background: var(--brand-green-light, #edf5ef);
  color: var(--brand-green, #426d58);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.cert-no-gen:hover {
  background: #e2efe6;
}

.teacher-avatar-fallback {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  border-radius: 50%;
  background: var(--brand-green-light);
  color: var(--brand-green);
  font-weight: 800;
}
.account-hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #8a9386;
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
