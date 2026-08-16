import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const srcRoot = path.join(root, 'src')
const failures = []

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function assertIncludes(file, text) {
  const source = read(file)
  if (!source.includes(text)) {
    failures.push(`${path.relative(root, file)}: missing "${text}"`)
  }
}

const routeFile = path.join(srcRoot, 'router', 'index.js')
const routeContracts = [
  ['/login', 'Login.vue'],
  ['/dashboard', 'Dashboard.vue'],
  ['/teachers', 'Teachers.vue'],
  ['/reviews', 'Reviews.vue'],
  ['/studios', 'Studios.vue'],
  ['/import', 'ImportTeachers.vue'],
  ['/analytics', 'Analytics.vue'],
  ['/permissions', 'Permissions.vue'],
  ['/settings', 'Settings.vue'],
]

for (const [routePath, viewName] of routeContracts) {
  assertIncludes(routeFile, `path: '${routePath}'`)
  const viewFile = path.join(srcRoot, 'views', viewName)
  if (!fs.existsSync(viewFile)) {
    failures.push(`views/${viewName}: missing routed view file`)
  }
}

const viewContracts = {
  'Dashboard.vue': ['数据看板', 'fetchDashboardCards'],
  'Teachers.vue': ['教师管理', '新增教师', 'fetchAdminTeachers'],
  'Reviews.vue': ['年审管理', '待处理', '年审工作台'],
  'Studios.vue': ['工作室管理', '新增工作室', 'fetchAdminStudios'],
  'ImportTeachers.vue': ['uploadImportPreview', 'commitImport'],
  'Analytics.vue': ['数据分析', '等级分布', 'fetchAnalytics'],
  'Permissions.vue': ['权限管理', '邀请管理员', 'fetchPermissions'],
  'Settings.vue': ['认证规则', '等级与年审周期', 'saveSettings'],
  'Login.vue': ['喜乐瑜伽', '登录'],
}

for (const [viewName, requiredTexts] of Object.entries(viewContracts)) {
  const file = path.join(srcRoot, 'views', viewName)
  for (const text of requiredTexts) {
    assertIncludes(file, text)
  }
}

const appFile = path.join(srcRoot, 'App.vue')
for (const label of ['本期总览', '年审工作台', '年审资料库', '教师档案', '认证场馆', '批量导入', '数据分析', '账号与权限', '认证规则']) {
  assertIncludes(appFile, label)
}

const forbiddenCopy = /(美林认证|善得人|联系他|联系TA)/
const mojibakeTokens = ['鍠', '鐟', '寰', '瀵', '璁', '銆', '乣', '鈱', '鉁']

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name)
    const stat = fs.statSync(file)
    if (stat.isDirectory()) {
      walk(file, out)
    } else if (/\.(vue|js|css)$/.test(file)) {
      out.push(file)
    }
  }
  return out
}

for (const file of walk(srcRoot)) {
  if (path.basename(file) === 'verifyAdminStatic.js') {
    continue
  }
  const source = read(file)
  if (forbiddenCopy.test(source)) {
    failures.push(`${path.relative(root, file)}: contains forbidden or stale brand copy`)
  }
  for (const token of mojibakeTokens) {
    if (source.includes(token)) {
      failures.push(`${path.relative(root, file)}: contains likely mojibake token ${token}`)
      break
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('admin static verification passed: routes, views, copy, and API contracts')
