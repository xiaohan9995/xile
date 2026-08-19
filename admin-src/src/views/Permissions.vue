<template>
  <div>
    <div class="page-head">
      <div>
        <h1>权限管理</h1>
        <p>管理系统管理员账号与小程序用户角色</p>
      </div>
      <button class="primary-btn" @click="showInvite = true">＋ 邀请管理员</button>
    </div>

    <!-- Admin accounts -->
    <h2 class="section-title">管理员账号</h2>
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>管理员</th>
            <th><span class="role-column-title">角色<button class="role-help" type="button" aria-label="查看角色权限范围">?<span class="role-tooltip"><b>角色权限说明</b><i>超级管理员：账号、规则与全部管理权限</i><i>审核管理员：批次、分配、退回与发布</i><i>审核组长：汇总组内意见、提交集体决议</i><i>审核成员：仅提交获分配教师的个人意见</i></span></button></span></th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in pagedMembers" :key="member.id">
            <td>
              <div class="cell-person">
                <ImagePreview v-if="member.avatarUrl" :image-class="'member-avatar user-avatar user-avatar-image'" :src="member.avatarUrl" alt="管理员头像" />
                <div v-else class="member-avatar">{{ member.username.charAt(0).toUpperCase() }}</div>
                <div>
                  <strong>{{ member.username }}</strong>
                </div>
              </div>
            </td>
            <td>
              <span class="status-pill" :class="member.role === 'super_admin' ? '' : 'blue'">
                {{ adminRoleLabel(member.role) }}
              </span>
            </td>
            <td>{{ member.createdAt || '—' }}</td>
            <td class="admin-actions"><button v-if="canEditAdmin(member)" class="text-btn" @click="openAdminRoleModal(member)">编辑角色</button><span v-else-if="member.id === auth.admin?.id" class="admin-self-hint">本人</span><span v-else class="admin-self-hint">—</span></td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:current-page="memberPage" :total-pages="memberTotalPages" :total-items="members.length" />
    </div>

    <div v-if="showAdminRoleModal" class="modal-backdrop" @click.self="showAdminRoleModal = false">
      <div class="admin-modal">
        <div class="modal-head"><h2>编辑管理员角色</h2><button @click="showAdminRoleModal = false">×</button></div>
        <p class="modal-desc">正在设置 <strong>{{ adminRoleForm.username }}</strong> 的后台权限。</p>
        <label>角色<select v-model="adminRoleForm.role"><option value="admin">审核管理员</option><option value="reviewer">审核成员</option><option value="group_leader">审核组长</option><option value="super_admin">超级管理员</option></select></label>
        <p class="role-modal-hint">角色变更后，该账号下次登录将看到对应的工作台与功能范围。</p>
        <div class="modal-actions"><button class="sync-btn" @click="showAdminRoleModal = false">取消</button><button class="primary-btn" @click="handleUpdateAdminRole">保存角色</button></div>
      </div>
    </div>

    <!-- Mini program users -->
    <h2 class="section-title">小程序用户</h2>
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>喜乐名</th>
            <th>手机号</th>
            <th>角色</th>
            <th>关联教师</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in pagedUsers" :key="user.id">
            <td>
              <div class="cell-person">
                <ImagePreview v-if="user.avatarUrl" :image-class="'member-avatar user-avatar user-avatar-image'" :src="user.avatarUrl" alt="小程序用户头像" />
                <div v-else class="member-avatar user-avatar">{{ user.id }}</div>
                <div>
                  <strong>{{ user.wechatName || user.nickname || user.nickName || '微信用户' }}</strong>
                  <code>{{ user.openid }}</code>
                </div>
              </div>
            </td>
            <td>{{ user.xileName || '—' }}</td>
            <td>{{ user.phone || '未绑定' }}</td>
            <td>
              <span class="status-pill" :class="user.role === 'teacher' ? 'blue' : 'gray'">
                {{ user.role === 'teacher' ? '教师' : '学员' }}
              </span>
            </td>
            <td>{{ user.teacherName || '—' }}</td>
            <td>{{ user.createdAt || '—' }}</td>
            <td>
              <button class="text-btn" @click="openRoleModal(user)">设置角色</button>
            </td>
          </tr>
          <tr v-if="!users.length">
            <td colspan="7" class="empty-cell">暂无注册用户</td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:current-page="userPage" :total-pages="userTotalPages" :total-items="users.length" />
    </div>

    <!-- Invite admin modal -->
    <div v-if="showInvite" class="modal-backdrop" @click.self="showInvite = false">
      <div class="admin-modal">
        <div class="modal-head">
          <h2>邀请管理员</h2>
          <button @click="showInvite = false">×</button>
        </div>
        <label>
          用户名
          <input v-model="inviteForm.username" placeholder="登录用户名" />
        </label>
        <label>
          初始密码
          <input v-model="inviteForm.password" type="password" placeholder="初始登录密码" />
        </label>
        <label>
          角色
          <select v-model="inviteForm.role">
            <option value="admin">审核管理员</option>
            <option value="reviewer">审核成员</option>
            <option value="group_leader">审核组长</option>
            <option value="super_admin">超级管理员</option>
          </select>
        </label>
        <div class="modal-actions">
          <button class="sync-btn" @click="showInvite = false">取消</button>
          <button class="primary-btn" @click="handleInvite">确认邀请</button>
        </div>
      </div>
    </div>

    <!-- Set role modal -->
    <div v-if="showRoleModal" class="modal-backdrop" @click.self="showRoleModal = false">
      <div class="admin-modal">
        <div class="modal-head">
          <h2>设置用户角色</h2>
          <button @click="showRoleModal = false">×</button>
        </div>
        <p class="modal-desc">用户 ID: {{ roleForm.userId }}，当前角色: {{ roleForm.currentRole === 'teacher' ? '教师' : '学员' }}</p>
        <label>
          角色
          <select v-model="roleForm.role">
            <option value="student">学员</option>
            <option value="teacher">教师</option>
          </select>
        </label>
        <label v-if="roleForm.role === 'teacher'">
          关联教师
          <select v-model="roleForm.teacherId">
            <option :value="null" disabled>请选择教师</option>
            <option v-for="t in teacherOptions" :key="t.id" :value="t.id">
              {{ t.name }}（{{ t.teacherNo }}）
            </option>
          </select>
        </label>
        <template v-if="roleForm.role === 'teacher'">
          <label>教师登录账号<input v-model="roleForm.username" placeholder="教师编号或自定义账号" /></label>
          <label>初始密码<input v-model="roleForm.password" type="password" placeholder="至少 8 位" /></label>
        </template>
        <div class="modal-actions">
          <button class="sync-btn" @click="showRoleModal = false">取消</button>
          <button class="primary-btn" @click="handleSetRole">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import ImagePreview from '../components/ImagePreview.vue'
import { createTeacherAccount, fetchPermissions, inviteAdmin, fetchUsers, updateAdminRole, updateUserRole, fetchAdminTeachers } from '../api/adminData'
import { useAuthStore } from '../stores/auth'
import Pagination from '../components/Pagination.vue'

const members = ref([])
const users = ref([])
const teacherOptions = ref([])
const showInvite = ref(false)
const showRoleModal = ref(false)
const showAdminRoleModal = ref(false)
const inviteForm = ref({ username: '', password: '', role: 'admin' })
const roleForm = ref({ userId: null, role: 'student', teacherId: null, currentRole: '', username: '', password: '' })
const adminRoleForm = ref({ id: null, username: '', role: '' })
const memberPage = ref(1)
const userPage = ref(1)
const pageSize = 15
const auth = useAuthStore()
const isSuperAdmin = computed(() => auth.admin?.role === 'super_admin')

const adminRoleLabel = (role) => ({ super_admin: '超级管理员', admin: '普通管理员', reviewer: '审核成员', group_leader: '审核组长' }[role] || role)
const canEditAdmin = (member) => isSuperAdmin.value && member.id !== auth.admin?.id
const memberTotalPages = computed(() => Math.ceil(members.value.length / pageSize))
const userTotalPages = computed(() => Math.ceil(users.value.length / pageSize))
const pagedMembers = computed(() => members.value.slice((memberPage.value - 1) * pageSize, memberPage.value * pageSize))
const pagedUsers = computed(() => users.value.slice((userPage.value - 1) * pageSize, userPage.value * pageSize))

onMounted(async () => {
  await Promise.all([loadMembers(), loadUsers(), loadTeachers()])
})

async function loadMembers() {
  try {
    members.value = await fetchPermissions()
  } catch (e) { /* fallback */ }
}

async function loadUsers() {
  try {
    users.value = await fetchUsers()
  } catch (e) { /* fallback */ }
}

async function loadTeachers() {
  try {
    const teachers = await fetchAdminTeachers()
    teacherOptions.value = teachers.map(t => ({ id: t.id, name: t.name, teacherNo: t.certNo }))
  } catch (e) { /* fallback */ }
}

function openRoleModal(user) {
  roleForm.value = {
    userId: user.id,
    role: user.role,
    teacherId: user.teacherId || null,
    currentRole: user.role,
    username: '',
    password: '',
  }
  showRoleModal.value = true
}

function openAdminRoleModal(member) {
  adminRoleForm.value = { id: member.id, username: member.username, role: member.role }
  showAdminRoleModal.value = true
}

async function handleUpdateAdminRole() {
  try {
    await updateAdminRole(adminRoleForm.value.id, adminRoleForm.value.role)
    showAdminRoleModal.value = false
    await loadMembers()
  } catch (e) {
    alert(e.response?.data?.error || '角色更新失败')
  }
}

async function handleSetRole() {
  const { userId, role, teacherId, username, password } = roleForm.value
  if (role === 'teacher' && !teacherId) {
    alert('请选择关联的教师')
    return
  }
  if (role === 'teacher' && (!username.trim() || password.length < 8)) {
    alert('请填写教师登录账号和至少 8 位的初始密码')
    return
  }
  try {
    await updateUserRole(userId, role, teacherId)
    if (role === 'teacher') {
      await createTeacherAccount({ teacherId, username, password })
    }
    showRoleModal.value = false
    await loadUsers()
  } catch (e) {
    alert(e.response?.data?.error || '设置失败')
  }
}

async function handleInvite() {
  if (!inviteForm.value.username) return
  try {
    await inviteAdmin(inviteForm.value)
    showInvite.value = false
    inviteForm.value = { username: '', password: '', role: 'admin' }
    await loadMembers()
  } catch (e) {
    alert(e.response?.data?.error || '邀请失败')
  }
}
</script>

<style scoped>
.section-title {
  margin: 32px 0 12px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--brand-green-light);
  color: var(--brand-green);
  font-weight: 800;
  font-size: 14px;
}

.user-avatar {
  background: #eee;
  color: #666;
  font-size: 12px;
}

.user-avatar-image {
  display: block;
  object-fit: cover;
}

.text-btn {
  background: none;
  border: none;
  color: var(--brand-green);
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.text-btn:hover {
  background: var(--brand-green-light);
}

.empty-cell {
  text-align: center;
  color: #999;
  padding: 24px;
}
.role-column-title { display:inline-flex; align-items:center; gap:6px; }
.role-help { position:relative; display:inline-grid; width:17px; height:17px; place-items:center; padding:0; border:1px solid #c8d2c9; border-radius:50%; color:var(--brand-green); background:#fff; font-size:11px; font-weight:800; cursor:help; }
.role-tooltip { position:absolute; z-index:8; top:calc(100% + 8px); left:-16px; display:none; width:250px; padding:13px; border:1px solid var(--line-strong); border-radius:10px; color:var(--ink); background:#fff; box-shadow:0 12px 28px rgba(41,56,44,.16); font-size:12px; font-weight:400; line-height:1.6; text-align:left; }
.role-tooltip::before { content:""; position:absolute; top:-5px; left:20px; width:8px; height:8px; border-top:1px solid var(--line-strong); border-left:1px solid var(--line-strong); background:#fff; transform:rotate(45deg); }
.role-tooltip b,.role-tooltip i { position:relative; display:block; font-style:normal; }
.role-tooltip b { margin-bottom:5px; font-size:12px; }
.role-help:hover .role-tooltip,.role-help:focus-visible .role-tooltip { display:block; }
.admin-actions { min-width:90px; }
.admin-self-hint { color:var(--muted-light); font-size:12px; }
.role-modal-hint { color:var(--muted); font-size:12px; line-height:1.6; }

.modal-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: #666;
}

.status-pill.gray {
  background: #f0f0f0;
  color: #666;
}
</style>
