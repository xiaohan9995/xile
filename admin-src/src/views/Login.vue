<template>
  <div class="login-page">
    <section class="login-card">
      <div class="login-brand">
        <div class="brand-mark">喜</div>
        <div>
          <h1>喜乐瑜伽</h1>
          <p>TEACHER CERTIFICATION</p>
        </div>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label>
          <span>用户名</span>
          <input v-model="username" autocomplete="username" placeholder="请输入用户名" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="password" autocomplete="current-password" placeholder="请输入密码" type="password" />
        </label>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button type="submit" class="primary-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await authStore.login(username.value, password.value)
    router.push(route.query.redirect || '/dashboard')
  } catch (err) {
    error.value = err.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #faf8f5;
}

.login-card {
  width: 400px;
  padding: 40px;
  border: 1px solid #eef0ee;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 30px 80px rgba(31, 37, 33, 0.10);
}

.login-brand {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 32px;
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #5d7261;
  color: #fff;
  font-size: 22px;
  font-weight: 800;
}

h1 {
  margin: 0;
  font-size: 20px;
  color: #1f2521;
}

p {
  margin: 4px 0 0;
  color: #9aa1a8;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
}

.login-form {
  display: grid;
  gap: 18px;
}

label span {
  display: block;
  margin-bottom: 8px;
  color: #65706a;
  font-size: 12px;
  font-weight: 800;
}

input {
  width: 100%;
  height: 44px;
  border: 1px solid #e7ebe8;
  border-radius: 14px;
  padding: 0 14px;
  background: #fafafa;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #5d7261;
}

.login-error {
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fef2f2;
  color: #b54c4c;
  font-size: 13px;
  font-weight: 600;
}

.primary-btn {
  height: 44px;
  margin-top: 4px;
  border: 0;
  border-radius: 14px;
  background: #5d7261;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover:not(:disabled) {
  background: #4b5c4e;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
