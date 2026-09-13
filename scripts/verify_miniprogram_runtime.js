const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const miniprogramRoot = path.join(root, 'miniprogram');
const pages = [];
const navigations = [];
const toasts = [];
// Pages guard themselves with auth.requireLogin / requireAuth, so the mock
// session must look like a logged-in teacher for the smoke checks to load data.
const storage = {
  auth_token: 'runtime-smoke-token',
  currentTeacherId: 2,
  currentUserRole: 'teacher',
  certApplication: {
    teacherId: 1,
    reviewYear: 2027,
  },
};

function sleep(ms = 20) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setByPath(target, key, value) {
  const parts = String(key).replace(/\[(\d+)\]/g, '.$1').split('.');
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (cursor[part] == null) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function createWxMock() {
  return {
    request(options) {
      if (typeof options.fail === 'function') {
        options.fail({ errMsg: 'mock network disabled, using local fallback' });
      }
    },
    uploadFile(options) {
      if (typeof options.success === 'function') {
        options.success({
          statusCode: 200,
          data: JSON.stringify({ fileKey: 'mock/uploads/runtime-review-material.pdf' }),
        });
      }
    },
    navigateTo(options) {
      navigations.push(options.url);
      if (typeof options.success === 'function') options.success({});
    },
    redirectTo(options) {
      navigations.push(options.url);
      if (typeof options.success === 'function') options.success({});
    },
    reLaunch(options) {
      navigations.push(options.url);
    },
    navigateBack() {
      navigations.push('navigateBack');
    },
    showToast(options) {
      toasts.push(options.title);
    },
    showLoading() {},
    hideLoading() {},
    stopPullDownRefresh() {},
    setNavigationBarTitle() {},
    chooseMessageFile(options) {
      options.success({
        tempFiles: [
          {
            name: 'runtime-review-material.pdf',
            size: 3200,
          },
        ],
      });
    },
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    removeStorageSync(key) {
      delete storage[key];
    },
  };
}

function loadPage(pagePath) {
  const absolute = path.join(miniprogramRoot, `${pagePath}.js`);
  delete require.cache[require.resolve(absolute)];
  pages.length = 0;
  global.wx = createWxMock();
  global.getApp = () => ({
    globalData: {
      apiBaseUrl: 'http://127.0.0.1:59999',
      // Force the request layer to fall back to utils/mock-data.js.
      useMockFallback: true,
      // Skip the async login wait branch in utils/auth.js.
      loginReady: true,
      loginPromise: Promise.resolve(),
      statusBarHeight: 20,
      teacherId: 2,
    },
  });
  global.Page = (definition) => {
    const instance = {
      ...definition,
      data: JSON.parse(JSON.stringify(definition.data || {})),
      setData(update) {
        for (const [key, value] of Object.entries(update)) {
          setByPath(this.data, key, value);
        }
      },
    };
    pages.push(instance);
  };
  require(absolute);
  if (pages.length !== 1) {
    throw new Error(`${pagePath}: expected one Page registration, got ${pages.length}`);
  }
  return pages[0];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const teacherSearch = loadPage('pages/teacher-search/teacher-search');
  teacherSearch.onLoad.call(teacherSearch);
  await sleep();
  assert(teacherSearch.data.teachers.length >= 3, 'teacher search should load mock teachers');
  teacherSearch.onTierChange.call(teacherSearch, { detail: { value: 4 } });
  await sleep();
  assert(teacherSearch.data.teachers.length === 1, 'teacher search L3 filter should narrow results');
  teacherSearch.openTeacher.call(teacherSearch, { currentTarget: { dataset: { id: 1 } } });
  assert(navigations.includes('/pages/teacher-detail/teacher-detail?id=1'), 'teacher card should navigate to detail');

  const teacherDetail = loadPage('pages/teacher-detail/teacher-detail');
  await teacherDetail.loadTeacher.call(teacherDetail, 1);
  assert(teacherDetail.data.teacher.name === '张三', 'teacher detail should load teacher profile');
  assert(teacherDetail.data.specialtiesText.includes('瑜伽'), 'teacher detail should derive specialties text');
  assert(!teacherDetail.contactTeacher, 'teacher detail should not expose direct contact action');

  const studios = loadPage('pages/studios/studios');
  studios.onLoad.call(studios);
  await sleep();
  assert(studios.data.studios.length >= 3, 'studios page should load mock studios');
  studios.changeCity.call(studios, { currentTarget: { dataset: { city: '杭州' } } });
  await sleep();
  assert(studios.data.studios.length === 1, 'studios city filter should narrow results');

  const studioDetail = loadPage('pages/studio-detail/studio-detail');
  await studioDetail.loadStudio.call(studioDetail, 1);
  assert(studioDetail.data.studio.name === '静心瑜伽空间', 'studio detail should load studio profile');
  studioDetail.contactStudio.call(studioDetail);
  assert(toasts.some((title) => title.includes('微信')), 'studio contact should fall back to the WeChat notice');

  if (fs.existsSync(path.join(miniprogramRoot, 'packageTeacher/home/home.js'))) {
    const teacherHome = loadPage('packageTeacher/home/home');
    teacherHome.onLoad.call(teacherHome);
    await sleep();
    assert(teacherHome.data.teacher.name === '李四', 'teacher home should load current certification');
  } else {
    console.warn('skipping teacher home smoke check: packageTeacher/home/home.js not found');
  }

  const reviewRecords = loadPage('packageTeacher/review-records/review-records');
  reviewRecords.onLoad.call(reviewRecords);
  await sleep();
  assert(reviewRecords.data.records[0].statusText === '审核中', 'review records should map submitted status');

  const reviewApply = loadPage('packageTeacher/review-apply/review-apply');
  reviewApply.onLoad.call(reviewApply);
  reviewApply.chooseFile.call(reviewApply, { currentTarget: { dataset: { index: 0 } } });
  assert(reviewApply.data.files[0].done, 'review apply should mark selected file as done');
  reviewApply.submitReview.call(reviewApply);
  await sleep(50);
  assert(
    navigations.includes('/packageTeacher/submission-success/submission-success'),
    'review apply should navigate to submission success after mock submit',
  );
  assert(reviewApply.data.submitting === false, 'review apply should reset submitting flag');

  console.log('miniprogram runtime smoke verification passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
