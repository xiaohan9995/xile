import { defineStore } from 'pinia'
import api from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    admin: null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    async login(username, password) {
      const data = await api.post('/login', { username, password })
      this.token = data.token
      this.admin = data.admin || { username }
      localStorage.setItem('admin_token', data.token)
      return data
    },
    logout() {
      this.token = ''
      this.admin = null
      localStorage.removeItem('admin_token')
    },
  },
})
