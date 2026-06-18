const path = require('path');

const root = path.resolve(__dirname, '..');
const miniprogramRoot = path.join(root, 'miniprogram');
const pages = [];
const navigations = [];
const toasts = [];
const storage = {
  currentTeacherId: 2,
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
    navigateTo(options) {
      navigations.push(options.url);
      if (typeof options.success === 'function') options.success({});
    },
    navigateBack() {
      navigations.push('navigateBack');
    },
    reLaunch(options) {
      navigations.push(options.url);
    },
    showToast(options) {
      toasts.push(options.title);
    },
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
  };
}

function loadPage(pagePath) {
  const absolute = path.join(miniprogramRoot, `${pagePath}.js`);
  delete require.cache[require.resolve(absolute)];
  pages.length = 0;
  global.wx = createWxMock();
  global.getApp = () => ({ globalData: { apiBaseUrl: 'http://127.0.0.1:59999' } });
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
  teacherSearch.changeLevel.call(teacherSearch, { currentTarget: { dataset: { level: 'L3' } } });
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
  studios.onKeywordInput.call(studios, { detail: { value: '静心' } });
  studios.applyFilters.call(studios);
  assert(studios.data.studios.length === 1, 'studios keyword filter should narrow results');

  const studioDetail = loadPage('pages/studio-detail/studio-detail');
  await studioDetail.loadStudio.call(studioDetail, 1);
  assert(studioDetail.data.studio.name === '静心瑜伽空间', 'studio detail should load studio profile');
  studioDetail.bookStudio.call(studioDetail);
  assert(toasts.some((title) => title.includes('有赞')), 'studio booking should show Youzan notice');

  const teacherHome = loadPage('packageTeacher/home/home');
  teacherHome.onLoad.call(teacherHome);
  await sleep();
  assert(teacherHome.data.teacher.name === '李四', 'teacher home should load current certification');

  const reviewRecords = loadPage('packageTeacher/review-records/review-records');
  reviewRecords.onLoad.call(reviewRecords);
  await sleep();
  assert(reviewRecords.data.records[0].status === '审核中', 'review records should map submitted status');

  const reviewApply = loadPage('packageTeacher/review-apply/review-apply');
  reviewApply.chooseFile.call(reviewApply, { currentTarget: { dataset: { index: 0 } } });
  assert(reviewApply.data.files[0].done, 'review apply should mark selected file as done');
  reviewApply.submitReview.call(reviewApply);
  await sleep();
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
