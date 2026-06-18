// API request helper
import axios from 'axios'

const instance = axios.create({
  baseURL: '/api/admin',
  timeout: 15000,
})

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

instance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)

const api = {
  get: (url, params) => instance.get(url, { params }),
  post: (url, data) => instance.post(url, data),
  put: (url, data) => instance.put(url, data),
  delete: (url) => instance.delete(url),
  upload: (url, formData) => instance.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

export default api
