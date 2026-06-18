Component({
  properties: {
    title: { type: String, value: '' },
    extra: { type: String, value: '' },
  },
  methods: {
    onExtraTap() {
      this.triggerEvent('extra');
    },
  },
});
