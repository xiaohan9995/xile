const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

function walk(dir, matcher, out = []) {
  const absolute = path.join(root, dir);
  for (const name of fs.readdirSync(absolute)) {
    const full = path.join(absolute, name);
    const relative = path.relative(root, full).replace(/\\/g, '/');
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(relative, matcher, out);
    } else if (matcher(relative)) {
      out.push(relative);
    }
  }
  return out;
}

const mojibakePattern = /(璁よ瘉|寮犱笁|鏉庡洓|鍠滀箰|鎴戠殑|涓婁紶|瀹℃牳|閫€|鍗冲皢|宸茶繃|鏈叕寮€|绯荤粺绠＄悊鍛?)/;
const scannedFiles = [
  'README.md',
  ...walk('backend/app', (file) => file.endsWith('.py')),
  ...walk('backend/tests', (file) => file.endsWith('.py')),
  ...walk('admin-src/src', (file) => /\.(vue|js|css)$/.test(file)),
  ...walk('miniprogram', (file) => /\.(js|json|wxml|wxss)$/.test(file)),
];

for (const file of scannedFiles) {
  const source = read(file);
  if (mojibakePattern.test(source)) {
    failures.push(`${file}: contains likely mojibake text`);
  }
}

const adminPackage = readJson('admin-src/package.json');
if (adminPackage.dependencies && adminPackage.dependencies['element-plus']) {
  failures.push('admin-src/package.json: Element Plus is still installed although no el-* components are used');
}

const adminMain = read('admin-src/src/main.js');
if (/ElementPlus|element-plus/.test(adminMain)) {
  failures.push('admin-src/src/main.js: contains unused Element Plus global registration');
}

const viteConfig = read('admin-src/vite.config.js');
if (!viteConfig.includes('manualChunks')) {
  failures.push('admin-src/vite.config.js: missing vendor manualChunks split');
}

if (!fs.existsSync(path.join(root, 'scripts/diagnose_wechat_cli.ps1'))) {
  failures.push('scripts/diagnose_wechat_cli.ps1: missing WeChat DevTools diagnostic helper');
}

if (!fs.existsSync(path.join(root, 'scripts/verify_backend_http.py'))) {
  failures.push('scripts/verify_backend_http.py: missing backend HTTP smoke verifier');
}

if (!fs.existsSync(path.join(root, 'scripts/verify_admin_preview.js'))) {
  failures.push('scripts/verify_admin_preview.js: missing admin preview smoke verifier');
}

if (!fs.existsSync(path.join(root, 'scripts/verify_miniprogram_runtime.js'))) {
  failures.push('scripts/verify_miniprogram_runtime.js: missing miniprogram runtime smoke verifier');
}

if (!fs.existsSync(path.join(root, 'scripts/verify_prototype_contract.js'))) {
  failures.push('scripts/verify_prototype_contract.js: missing prototype contract verifier');
}

if (!fs.existsSync(path.join(root, 'scripts/verify_admin_visual.py'))) {
  failures.push('scripts/verify_admin_visual.py: missing admin browser visual verifier');
}

const adminVisualDir = path.join(root, 'docss/visual-qa/admin-browser');
const adminVisualIndex = path.join(adminVisualDir, 'index.html');
const adminVisualScreens = ['login', 'dashboard', 'teachers', 'reviews', 'studios', 'analytics', 'settings'];
if (!fs.existsSync(adminVisualIndex)) {
  failures.push('docss/visual-qa/admin-browser/index.html: missing admin screenshot index');
} else {
  const indexHtml = fs.readFileSync(adminVisualIndex, 'utf8');
  for (const screen of adminVisualScreens) {
    const png = path.join(adminVisualDir, `${screen}.png`);
    if (!fs.existsSync(png)) {
      failures.push(`docss/visual-qa/admin-browser/${screen}.png: missing admin screenshot`);
    }
    if (!indexHtml.includes(`${screen}.png`)) {
      failures.push(`docss/visual-qa/admin-browser/index.html: missing ${screen}.png link`);
    }
  }
}

const checklist = read('docss/整套UI复刻验证清单.md');
for (const expected of [
  '当前无大 chunk 警告',
  '/api/mp/teachers/<id>/certification',
  '/api/mp/reviews',
  '16 个测试',
  'node scripts\\verify_all.js',
  'scripts\\diagnose_wechat_cli.ps1',
  'python scripts\\verify_backend_http.py',
  'node scripts\\verify_admin_preview.js',
  'node scripts\\verify_miniprogram_runtime.js',
  'node scripts\\verify_prototype_contract.js',
  'python scripts\\verify_admin_visual.py',
]) {
  if (!checklist.includes(expected)) {
    failures.push(`docss/整套UI复刻验证清单.md: missing status "${expected}"`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`project static verification passed: ${scannedFiles.length} source files`);
