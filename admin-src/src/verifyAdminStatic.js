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
  'Dashboard.vue': ['数据看板', '年审趋势统计', '待处理事项', 'fetchDashboardCards'],
  'Teachers.vue': ['教师管理 roster', '添加新登记导师', '认证等级', 'fetchAdminTeachers'],
  'Reviews.vue': ['年审管理 / 待审核', '年审信息与材料', '审核意见', 'submitReviewDecision'],
  'Studios.vue': ['工作室入驻', '添加合伙工作室', '预约专线', 'fetchAdminStudios'],
  'ImportTeachers.vue': ['教师批量导入', '上传 Excel', '最近导入批次'],
  'Analytics.vue': ['数据分析', '认证转化率', '等级分布', '城市热度'],
  'Permissions.vue': ['权限管理', '邀请管理员', '教师管理委员会'],
  'Settings.vue': ['系统设置', '年审规则', '有赞学堂地址', '客服电话'],
  'Login.vue': ['喜乐瑜伽教师认证中心', '管理员账号', '登录密码'],
}

for (const [viewName, requiredTexts] of Object.entries(viewContracts)) {
  const file = path.join(srcRoot, 'views', viewName)
  for (const text of requiredTexts) {
    assertIncludes(file, text)
  }
}

const appFile = path.join(srcRoot, 'App.vue')
for (const label of ['首页看板', '教师管理', '年审管理', '工作室管理', '批量导入', '数据分析', '权限管理', '系统设置']) {
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
