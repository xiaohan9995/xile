Component({
  properties: {
    studio: {
      type: Object,
      value: {},
    },
  },

  data: {
    displayTags: [],
    coverImage: '',
    coverInitial: '',
  },

  observers: {
    'studio.tags': function (tags) {
      // Show at most 3 tags
      const list = Array.isArray(tags) ? tags.slice(0, 3) : [];
      this.setData({ displayTags: list });
    },
    'studio': function (studio) {
      const images = studio && Array.isArray(studio.images) ? studio.images : [];
      const cover = images[0] || (studio && studio.coverUrl) || (studio && studio.coverImage) || '';
      const name = (studio && studio.name) || '';
      this.setData({
        coverImage: cover || '',
        coverInitial: cover ? '' : (name.trim().charAt(0) || '馆'),
      });
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
