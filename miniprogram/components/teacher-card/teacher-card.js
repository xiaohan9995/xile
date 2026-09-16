Component({
  properties: {
    teacher: {
      type: Object,
      value: {},
    },
  },

  data: {
    displayName: '—',
    realName: '',
    location: '',
  },

  observers: {
    'teacher': function (teacher) {
      if (!teacher) return;
      const displayName = teacher.xileName || teacher.realName || teacher.name || '';
      // The card title is the public identity (喜乐名/别名); the legal name is
      // shown as a secondary line so the two never get confused.
      const realName = teacher.realName || '';
      const showRealName = realName && realName !== displayName ? realName : '';
      const location = [teacher.city, teacher.district].filter(Boolean).join(' · ');
      this.setData({ displayName: displayName || '—', realName: showRealName, location });
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
