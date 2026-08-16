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
  { path: '/dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { roles: ['admin', 'super_admin'] } },
  { path: '/teachers', name: 'Teachers', component: () => import('../views/Teachers.vue'), meta: { roles: ['admin', 'super_admin'] } },
  { path: '/reviews', name: 'Reviews', component: () => import('../views/Reviews.vue'), meta: { roles: ['admin', 'super_admin'] } },
  { path: '/review-workflow', name: 'ReviewWorkflow', component: () => import('../views/ReviewWorkflow.vue') },
  { path: '/guide', name: 'Guide', component: () => import('../views/Guide.vue') },
  { path: '/studios', name: 'Studios', component: () => import('../views/Studios.vue'), meta: { roles: ['admin', 'super_admin'] } },
  { path: '/import', name: 'ImportTeachers', component: () => import('../views/ImportTeachers.vue'), meta: { roles: ['super_admin'] } },
  { path: '/analytics', name: 'Analytics', component: () => import('../views/Analytics.vue'), meta: { roles: ['super_admin'] } },
  { path: '/permissions', name: 'Permissions', component: () => import('../views/Permissions.vue'), meta: { roles: ['super_admin'] } },
  { path: '/settings', name: 'Settings', component: () => import('../views/Settings.vue'), meta: { roles: ['super_admin'] } },
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  const token = localStorage.getItem('admin_token')
  if (!token) return { name: 'Login', query: { redirect: to.fullPath } }
  const profile = JSON.parse(localStorage.getItem('admin_profile') || '{}')
  if (to.meta.roles && !to.meta.roles.includes(profile.role || 'super_admin')) return { name: 'ReviewWorkflow' }
  return true
})

export default router
