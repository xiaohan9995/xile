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
            <th>角色</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.id">
            <td>
              <div class="cell-person">
                <div class="member-avatar">{{ member.username.charAt(0).toUpperCase() }}</div>
                <div>
                  <strong>{{ member.username }}</strong>
                </div>
              </div>
            </td>
            <td>
              <span class="status-pill" :class="member.role === 'super_admin' ? '' : 'blue'">
                {{ member.role === 'super_admin' ? '超级管理员' : '审核管理员' }}
              </span>
            </td>
            <td>{{ member.createdAt || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mini program users -->
    <h2 class="section-title">小程序用户</h2>
    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>手机号</th>
            <th>角色</th>
            <th>关联教师</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>
              <div class="cell-person">
                <div class="member-avatar user-avatar">{{ user.id }}</div>
                <div><code>{{ user.openid }}</code></div>
              </div>
            </td>
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
            <td colspan="6" class="empty-cell">暂无注册用户</td>
          </tr>
        </tbody>
      </table>
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
        <div class="modal-actions">
          <button class="sync-btn" @click="showRoleModal = false">取消</button>
          <button class="primary-btn" @click="handleSetRole">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchPermissions, inviteAdmin, fetchUsers, updateUserRole, fetchAdminTeachers } from '../api/adminData'

const members = ref([])
const users = ref([])
const teacherOptions = ref([])
const showInvite = ref(false)
const showRoleModal = ref(false)
const inviteForm = ref({ username: '', password: '', role: 'admin' })
const roleForm = ref({ userId: null, role: 'student', teacherId: null, currentRole: '' })

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
  }
  showRoleModal.value = true
}

async function handleSetRole() {
  const { userId, role, teacherId } = roleForm.value
  if (role === 'teacher' && !teacherId) {
    alert('请选择关联的教师')
    return
  }
  try {
    await updateUserRole(userId, role, teacherId)
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
