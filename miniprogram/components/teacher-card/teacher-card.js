Component({
  properties: {
    teacher: {
      type: Object,
      value: {},
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
