import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  { path: '/dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
  { path: '/teachers', name: 'Teachers', component: () => import('../views/Teachers.vue') },
  { path: '/reviews', name: 'Reviews', component: () => import('../views/Reviews.vue') },
  { path: '/studios', name: 'Studios', component: () => import('../views/Studios.vue') },
  { path: '/import', name: 'ImportTeachers', component: () => import('../views/ImportTeachers.vue') },
  { path: '/analytics', name: 'Analytics', component: () => import('../views/Analytics.vue') },
  { path: '/permissions', name: 'Permissions', component: () => import('../views/Permissions.vue') },
  { path: '/settings', name: 'Settings', component: () => import('../views/Settings.vue') },
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  const token = localStorage.getItem('admin_token')
  if (!token) return { name: 'Login', query: { redirect: to.fullPath } }
  return true
})

export default router
