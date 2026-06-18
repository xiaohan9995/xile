<template>
  <div>
    <div class="page-head">
      <div>
        <h1>权限管理</h1>
        <p>管理系统管理员账号与权限</p>
      </div>
      <button class="primary-btn" @click="showInvite = true">＋ 邀请管理员</button>
    </div>

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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchPermissions, inviteAdmin } from '../api/adminData'

const members = ref([])
const showInvite = ref(false)
const inviteForm = ref({ username: '', password: '', role: 'admin' })

onMounted(async () => {
  await loadMembers()
})

async function loadMembers() {
  try {
    members.value = await fetchPermissions()
  } catch (e) { /* fallback */ }
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
</style>
