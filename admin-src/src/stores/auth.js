import { defineStore } from 'pinia'
import api from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    admin: JSON.parse(localStorage.getItem('admin_profile') || 'null'),
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    async login(username, password) {
      const data = await api.post('/login', { username, password })
      this.token = data.token
      // 角色一律以服务端返回为准，不在前端猜测，避免越权展示后台页面。
      this.admin = data.admin || { username, role: '' }
      localStorage.setItem('admin_profile', JSON.stringify(this.admin))
      localStorage.setItem('admin_token', data.token)
      return data
    },
    logout() {
      this.token = ''
      this.admin = null
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_profile')
    },
  },
})
