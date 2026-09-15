Component({
  properties: {
    teacher: {
      type: Object,
      value: {},
    },
  },

  observers: {
    'teacher': function (teacher) {
      if (!teacher) return;
      const displayName = teacher.xileName || teacher.realName || teacher.name || '';
      const location = [teacher.city, teacher.district].filter(Boolean).join(' · ');
      this.setData({ displayName: displayName || '—', location });
    },
  },

  methods: {
    onTap() {
      const { id } = this.data.teacher;
      if (id) {
        wx.navigateTo({
          url: `/pages/teacher-detail/teacher-detail?id=${id}`,
        });
      }
      this.triggerEvent('tap', { teacher: this.data.teacher });
    },
  },
});
