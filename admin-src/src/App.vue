<template>
  <router-view v-if="isLoginRoute" />
  <div v-else class="admin-console">
    <div class="admin-frame">
      <header class="admin-topbar">
        <span class="version-pill">JOY YOGA · 管理工作台</span>
        <span class="topbar-context">教师认证 / 年审协作</span>
        <div class="topbar-actions">
          <RouterLink to="/guide" class="topbar-help" aria-label="打开系统操作指引" title="操作指引">?</RouterLink>
          <div class="admin-user">
            <span class="admin-presence"></span>
            <div><strong>{{ adminName }}</strong><small>{{ roleLabel }} · 在线工作中</small></div>
          </div>
        </div>
      </header>

      <main class="admin-layout">
        <aside class="admin-sidebar">
          <div>
            <div class="admin-brand">
              <div class="brand-mark">喜</div>
              <div>
                <strong>喜乐瑜伽教师</strong>
                <span>认证管理中心</span>
              </div>
            </div>
            <nav class="side-menu">
              <span class="menu-label">工作台</span>
              <RouterLink v-if="canManage" to="/dashboard"><i>01</i>本期总览</RouterLink>
              <RouterLink to="/review-workflow"><i>{{ canManage ? '02' : '01' }}</i>{{ role === 'group_leader' ? '审核小组' : role === 'reviewer' ? '我的审核' : '年审工作台' }}</RouterLink>
              <RouterLink v-if="canManage" to="/reviews"><i>03</i>年审资料库</RouterLink>
              <template v-if="canManage">
                <span class="menu-label">认证管理</span>
                <RouterLink to="/teachers"><i>04</i>教师档案</RouterLink>
                <RouterLink to="/studios"><i>05</i>认证场馆</RouterLink>
              </template>
              <template v-if="isSuperAdmin">
                <span class="menu-label">系统</span>
                <RouterLink to="/import"><i>06</i>批量导入</RouterLink>
                <RouterLink to="/analytics"><i>07</i>数据分析</RouterLink>
                <RouterLink to="/permissions"><i>08</i>账号与权限</RouterLink>
                <RouterLink to="/settings"><i>09</i>认证规则</RouterLink>
              </template>
            </nav>
          </div>
          <div class="sidebar-note">
            <strong>本期工作提示</strong>
            小程序提交的材料会进入审核队列；完成发布后，教师端将同步展示结果。
          </div>
        </aside>

        <section class="admin-workspace">
          <router-view />
        </section>
      </main>
    </div>

    <!-- Toast notifications -->
    <Transition name="toast">
      <div v-if="toasts.length" class="toast-container">
        <div v-for="t in toasts" :key="t.id" class="toast-item" :class="'toast--' + t.type">
          {{ t.message }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from './composables/useToast'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const isLoginRoute = computed(() => route.name === 'Login')
const { toasts } = useToast()
const auth = useAuthStore()
const role = computed(() => auth.admin?.role || 'super_admin')
const canManage = computed(() => ['admin', 'super_admin'].includes(role.value))
const isSuperAdmin = computed(() => role.value === 'super_admin')
const adminName = computed(() => auth.admin?.name || auth.admin?.username || '系统管理员')
const roleLabel = computed(() => ({ reviewer: '审核成员', group_leader: '审核组长', admin: '年审管理员', super_admin: '系统管理员' }[role.value] || '审核成员'))
</script>
