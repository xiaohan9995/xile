<template>
  <router-view v-if="isLoginRoute" />
  <div v-else class="admin-console">
    <div class="admin-frame">
      <header class="admin-topbar">
        <span class="version-pill">JoyYoga Back-End Console v2.0</span>
        <div class="admin-user">
          <img class="admin-avatar" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop" alt="管理员" />
          <span>系统管理员</span>
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
              <RouterLink to="/dashboard">⌂ 首页看板</RouterLink>
              <RouterLink to="/teachers">♧ 教师管理</RouterLink>
              <RouterLink to="/reviews">◷ 年审及审核</RouterLink>
              <RouterLink to="/studios">⌖ 工作室管理</RouterLink>
              <RouterLink to="/import">⇧ 批量导入</RouterLink>
              <RouterLink to="/analytics">◎ 数据分析</RouterLink>
              <RouterLink to="/permissions">⚙ 权限管理</RouterLink>
              <RouterLink to="/settings">◇ 系统设置</RouterLink>
            </nav>
          </div>
          <div class="sidebar-note">
            小程序数据已接入数据库双轨联调。右侧审核后，左侧即时获发权威印章数字证书。
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

const route = useRoute()
const isLoginRoute = computed(() => route.name === 'Login')
const { toasts } = useToast()
</script>
