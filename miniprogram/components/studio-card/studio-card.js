Component({
  properties: {
    studio: {
      type: Object,
      value: {},
    },
  },

  data: {
    displayTags: [],
  },

  observers: {
    'studio.tags': function (tags) {
      // Show at most 3 tags
      const list = Array.isArray(tags) ? tags.slice(0, 3) : [];
      this.setData({ displayTags: list });
    },
  },

  methods: {
    onTap() {
      const { id } = this.data.studio;
      if (id) {
        wx.navigateTo({
          url: `/pages/studio-detail/studio-detail?id=${id}`,
        });
      }
      this.triggerEvent('tap', { studio: this.data.studio });
    },
  },
});
