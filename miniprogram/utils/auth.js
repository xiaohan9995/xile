const getOpenId = () => {
  return new Promise((resolve) => {
    wx.login({
      success: (res) => resolve(res.code || ''),
      fail: () => resolve(''),
    });
  });
};

const getTeacherId = () => {
  return getApp().globalData.teacherId || null;
};

const isTeacher = () => {
  return !!getTeacherId();
};

module.exports = { getOpenId, getTeacherId, isTeacher };
