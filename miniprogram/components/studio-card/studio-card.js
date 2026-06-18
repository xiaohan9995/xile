Component({
  properties: {
    studio: { type: Object, value: {} },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { studio: this.data.studio });
    },
  },
});
