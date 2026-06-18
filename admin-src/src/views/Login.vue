<template>
  <div class="login-page">
    <section class="login-card">
      <div class="login-brand">
        <div class="brand-mark">瑜</div>
        <div>
          <h1>喜乐瑜伽教师认证中心</h1>
          <p>JoyYoga Back-End Console v2.0</p>
        </div>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label>
          <span>管理员账号</span>
          <input v-model="username" autocomplete="username" placeholder="请输入账号" />
        </label>
        <label>
          <span>登录密码</span>
          <input v-model="password" autocomplete="current-password" placeholder="请输入密码" type="password" />
        </label>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button type="submit" class="primary-btn" :disabled="loading">
          {{ loading ? '正在进入...' : '进入管理后台' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const username = ref('admin')
const password = ref('password')
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    router.push('/dashboard')
  } catch (err) {
    error.value = '账号或密码不正确'
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
  background:
    radial-gradient(circle at 20% 10%, rgba(187, 161, 120, 0.18), transparent 28%),
    radial-gradient(circle at 90% 20%, rgba(93, 114, 97, 0.16), transparent 30%),
    #faf8f5;
}

.login-card {
  width: 420px;
  padding: 34px;
  border: 1px solid #eef0ee;
  border-radius: 32px;
  background: rgba(255,255,255,0.92);
  box-shadow: 0 30px 80px rgba(31, 37, 33, 0.12);
}

.login-brand {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 28px;
}

h1 {
  margin: 0;
  font-size: 20px;
}

p {
  margin: 5px 0 0;
  color: #9aa1a8;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
}

.login-form {
  display: grid;
  gap: 16px;
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
}

.login-error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fef2f2;
  color: #b54c4c;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
}
</style>
