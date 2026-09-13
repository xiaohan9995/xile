const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

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

const scriptArtifacts = [
  { file: 'scripts/diagnose_wechat_cli.ps1', label: 'WeChat DevTools diagnostic helper', optional: true },
  { file: 'scripts/verify_backend_http.py', label: 'backend HTTP smoke verifier' },
  { file: 'scripts/verify_admin_preview.js', label: 'admin preview smoke verifier', optional: true },
  { file: 'scripts/verify_miniprogram_runtime.js', label: 'miniprogram runtime smoke verifier' },
  { file: 'scripts/verify_prototype_contract.js', label: 'prototype contract verifier' },
  { file: 'scripts/verify_admin_visual.py', label: 'admin browser visual verifier', optional: true },
];

for (const artifact of scriptArtifacts) {
  if (fs.existsSync(path.join(root, artifact.file))) continue;
  if (artifact.optional) {
    warnings.push(`${artifact.file}: ${artifact.label} not found; related checks skipped`);
  } else {
    failures.push(`${artifact.file}: missing ${artifact.label}`);
  }
}

const adminVisualDir = path.join(root, 'docss/visual-qa/admin-browser');
const adminVisualIndex = path.join(adminVisualDir, 'index.html');
const adminVisualScreens = ['login', 'dashboard', 'teachers', 'reviews', 'studios', 'analytics', 'settings'];
if (!fs.existsSync(adminVisualIndex)) {
  warnings.push('docss/visual-qa/admin-browser/index.html: admin screenshot index not found; visual QA checks skipped');
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

const checklistPath = path.join(root, 'docss/整套UI复刻验证清单.md');
if (!fs.existsSync(checklistPath)) {
  warnings.push('docss/整套UI复刻验证清单.md: verification checklist not found; checklist checks skipped');
} else {
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
}

if (warnings.length) {
  console.warn(warnings.join('\n'));
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`project static verification passed: ${scannedFiles.length} source files`);
