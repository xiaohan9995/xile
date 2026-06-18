const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const prototypeBase = path.join(root, 'prototype', 'product-design');
const failures = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function requireIncludes(file, token, label = token) {
  const source = read(file);
  if (!source.includes(token)) {
    failures.push(`${path.relative(root, file)}: missing ${label}`);
  }
}

function walk(dir, matcher, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.vite') continue;
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      walk(file, matcher, out);
    } else if (matcher(file)) {
      out.push(file);
    }
  }
  return out;
}

const prototypeRoot = fs
  .readdirSync(prototypeBase, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(prototypeBase, entry.name))
  .find((dir) => fs.existsSync(path.join(dir, 'src', 'App.tsx')));

if (!prototypeRoot) {
  failures.push('prototype/product-design: missing React prototype project with src/App.tsx');
} else {
  const appFile = path.join(prototypeRoot, 'src', 'App.tsx');
  const miniFile = path.join(prototypeRoot, 'src', 'components', 'MiniProgramViews.tsx');
  const adminFile = path.join(prototypeRoot, 'src', 'components', 'AdminPortal.tsx');
  const mockDataFile = path.join(prototypeRoot, 'src', 'mockData.ts');

  for (const file of [appFile, miniFile, adminFile, mockDataFile]) {
    if (!fs.existsSync(file)) {
      failures.push(`${path.relative(root, file)}: missing prototype source file`);
    }
  }

  if (fs.existsSync(appFile)) {
    for (const view of [
      'home',
      'instructor-query',
      'studio-discovery',
      'profile',
      'cert-step1',
      'cert-step2',
      'certificate',
      'success',
    ]) {
      requireIncludes(appFile, `activeView === "${view}"`, `mini-program view route ${view}`);
    }
    requireIncludes(appFile, '<AdminPortal', 'admin portal mounting');
    requireIncludes(appFile, 'selectedStudio', 'studio detail inspector state');
  }

  if (fs.existsSync(miniFile)) {
    for (const viewFn of [
      'HomeView',
      'InstructorQueryView',
      'StudioDiscoveryView',
      'InstructorProfileView',
      'CertStep1View',
      'CertStep2View',
      'CertificatePreviewView',
      'SubmissionSuccessView',
    ]) {
      requireIncludes(miniFile, `export function ${viewFn}`, `mini-program prototype view ${viewFn}`);
    }
    for (const copy of ['瑜伽工作室', '年度记录', '证书查看', '联系客服', '上传证明材料']) {
      requireIncludes(miniFile, copy, `mini-program prototype copy ${copy}`);
    }
  }

  if (fs.existsSync(adminFile)) {
    for (const menu of ['dashboard', 'instructors', 'reviews', 'studios', 'stats', 'permissions', 'settings']) {
      requireIncludes(adminFile, `id: "${menu}"`, `admin menu ${menu}`);
      requireIncludes(adminFile, `currentMenu === "${menu}"`, `admin render branch ${menu}`);
    }
    for (const copy of ['首页看板', '教师管理', '年审及审核', '工作室管理', '数据分析', '权限管理', '后台设置']) {
      requireIncludes(adminFile, copy, `admin prototype copy ${copy}`);
    }
  }

  if (fs.existsSync(mockDataFile)) {
    requireIncludes(mockDataFile, 'mockInstructors', 'teacher prototype mock data');
    requireIncludes(mockDataFile, 'mockStudios', 'studio prototype mock data');
  }

  const forbiddenBrandCopy = /(美林认证|善得人|联系他|联系TA)/;
  const mojibakeTokens = ['鍠', '鐟', '寰', '瀵', '璁', '銆', '乣', '鈱', '鉁'];
  for (const file of walk(prototypeRoot, (item) => /\.(tsx|ts|css|html|md)$/.test(item))) {
    const source = read(file);
    if (forbiddenBrandCopy.test(source)) {
      failures.push(`${path.relative(root, file)}: contains forbidden or stale brand copy`);
    }
    for (const token of mojibakeTokens) {
      if (source.includes(token)) {
        failures.push(`${path.relative(root, file)}: contains likely mojibake token ${token}`);
        break;
      }
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('prototype contract verification passed');
