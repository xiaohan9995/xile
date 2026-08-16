const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const miniprogramRoot = path.join(root, 'miniprogram');
const appJsonPath = path.join(miniprogramRoot, 'app.json');
const sitemapPath = path.join(miniprogramRoot, 'sitemap.json');
const failures = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    failures.push(`${file}: invalid JSON: ${error.message}`);
    return null;
  }
}

function walk(dir, matcher, out = []) {
  for (const name of fs.readdirSync(dir)) {
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

function pageJsonPath(pagePath) {
  return path.join(miniprogramRoot, `${pagePath}.json`);
}

function pageWxmlPath(pagePath) {
  return path.join(miniprogramRoot, `${pagePath}.wxml`);
}

function collectPages(appJson) {
  const pages = [...(appJson.pages || [])];
  for (const pack of appJson.subPackages || []) {
    for (const page of pack.pages || []) {
      pages.push(`${pack.root}/${page}`);
    }
  }
  return pages;
}

const appJson = readJson(appJsonPath);
if (!appJson) {
  process.exit(1);
}

const pageSet = new Set(collectPages(appJson));
const sitemap = readJson(sitemapPath);
if (sitemap && Array.isArray(sitemap.rules)) {
  const allowedPages = new Set(
    sitemap.rules
      .filter((rule) => rule.action === 'allow' && rule.page)
      .map((rule) => rule.page)
  );
  for (const page of pageSet) {
    if (!allowedPages.has(page)) {
      failures.push(`sitemap: missing allow rule for ${page}`);
    }
  }
}

for (const file of walk(miniprogramRoot, (item) => item.endsWith('.json'))) {
  readJson(file);
}

for (const file of walk(miniprogramRoot, (item) => item.endsWith('.js'))) {
  try {
    new Function(read(file));
  } catch (error) {
    failures.push(`${file}: invalid JS: ${error.message}`);
  }
}

const htmlTagPattern = /<\/?(span|strong|div|p|h[1-6])\b/i;
const unsupportedWxssRules = [
  { pattern: /\bfit-content\b/i, label: 'fit-content' },
  { pattern: /\bbackdrop-filter\s*:/i, label: 'backdrop-filter' },
  { pattern: /\b-webkit-backdrop-filter\s*:/i, label: '-webkit-backdrop-filter' },
];
const forbiddenBrandCopy = /(美林认证|善得人|联系他|联系TA)/;
const mojibakeTokens = ['鍠', '鐟', '寰', '瀵', '璁', '銆', '乣', '鈱', '鉁'];

const requiredPageText = {
  'pages/index/index': [
    'JOY YOGA',
    '让每一次练习',
    '教师查询',
    '我的认证',
    '瑜伽工作室',
  ],
  'pages/teacher-search/teacher-search': [
    '教师查询',
    '未找到匹配教师',
  ],
  'pages/teacher-detail/teacher-detail': [
    '喜乐名',
    '认证等级',
    '证书展示',
  ],
  'pages/studios/studios': [
    '瑜伽工作室',
    '找一处安静练习的空间',
    '未找到匹配的工作室',
  ],
  'pages/studio-detail/studio-detail': [
    '工作室详情',
    '主理教师',
    '开放时间',
  ],
  'packageTeacher/home/home': [
    '我的认证',
    '本期年审',
    '到期天数',
    '退出登录',
  ],
  'packageTeacher/profile/profile': [],
  'packageTeacher/cert-step1/cert-step1': [
    '认证申请',
    '个人信息',
    '资料上传',
    '审核中',
    '导师认证基础资料',
  ],
  'packageTeacher/review-apply/review-apply': [
    '上传认证材料',
    '资料已带入',
    '资料上传',
    '提交审核',
  ],
  'packageTeacher/review-records/review-records': [
    '有效期至',
    '年审记录',
    '全部记录',
  ],
  'packageTeacher/teaching-records/teaching-records': [
    '按月份筛选',
    '保存草稿',
  ],
  'packageTeacher/submission-success/submission-success': [
    '申请已成功提交',
    '教师管理委员会',
    '返回首页',
  ],
};

const requiredJsSnippets = {
  'packageTeacher/home/home': ['/certification', 'request({'],
  'packageTeacher/profile/profile': ['/certification', 'request({'],
  'packageTeacher/review-records/review-records': ['/certification', 'request({'],
  'packageTeacher/review-apply/review-apply': ['/api/mp/reviews', "method: 'POST'"],
};

for (const file of walk(miniprogramRoot, (item) => item.endsWith('.wxml'))) {
  const wxml = read(file);
  if (htmlTagPattern.test(wxml)) {
    failures.push(`${file}: contains unsupported HTML-like tags`);
  }
  if (forbiddenBrandCopy.test(wxml)) {
    failures.push(`${file}: contains forbidden or stale brand copy`);
  }
  for (const token of mojibakeTokens) {
    if (wxml.includes(token)) {
      failures.push(`${file}: contains likely mojibake token ${token}`);
      break;
    }
  }

  const relative = path.relative(miniprogramRoot, file).replace(/\\/g, '/').replace(/\.wxml$/, '');
  for (const text of requiredPageText[relative] || []) {
    if (!wxml.includes(text)) {
      failures.push(`${relative}: missing required page text "${text}"`);
    }
  }

  const jsonFile = pageJsonPath(relative);
  if (fs.existsSync(jsonFile) && /(query-header|cert-header)/.test(wxml)) {
    const pageJson = readJson(jsonFile);
    if (pageJson && pageJson.navigationStyle !== 'custom') {
      failures.push(`${relative}: has custom header but navigationStyle is not custom`);
    }
  }

  const routePattern = /data-url="([^"]+)"/g;
  let match;
  while ((match = routePattern.exec(wxml))) {
    const route = match[1];
    if (!route || route.includes('{{')) continue;
    const normalized = route.replace(/^\//, '');
    if (!pageSet.has(normalized)) {
      failures.push(`${relative}: data-url points to missing page ${route}`);
    }
  }
}

for (const file of walk(miniprogramRoot, (item) => item.endsWith('.wxss'))) {
  const wxss = read(file);
  for (const rule of unsupportedWxssRules) {
    if (rule.pattern.test(wxss)) {
      failures.push(`${file}: contains unsupported or fragile WXSS rule ${rule.label}`);
    }
  }
}

for (const file of walk(miniprogramRoot, (item) => item.endsWith('.js') || item.endsWith('.json'))) {
  const source = read(file);
  for (const token of mojibakeTokens) {
    if (source.includes(token)) {
      failures.push(`${file}: contains likely mojibake token ${token}`);
      break;
    }
  }
  if (forbiddenBrandCopy.test(source)) {
    failures.push(`${file}: contains forbidden or stale brand copy`);
  }

  if (file.endsWith('.js')) {
    const relative = path.relative(miniprogramRoot, file).replace(/\\/g, '/').replace(/\.js$/, '');
    for (const snippet of requiredJsSnippets[relative] || []) {
      if (!source.includes(snippet)) {
        failures.push(`${relative}: missing required JS contract "${snippet}"`);
      }
    }
  }
}

for (const page of pageSet) {
  const jsonFile = pageJsonPath(page);
  const wxmlFile = pageWxmlPath(page);
  const jsFile = path.join(miniprogramRoot, `${page}.js`);
  if (!fs.existsSync(jsonFile)) failures.push(`${page}: missing page json`);
  if (!fs.existsSync(wxmlFile)) failures.push(`${page}: missing page wxml`);
  if (!fs.existsSync(jsFile)) failures.push(`${page}: missing page js`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`miniprogram static verification passed: ${pageSet.size} pages`);
