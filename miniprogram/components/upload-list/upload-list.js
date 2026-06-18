Component({
  properties: {
    files: { type: Array, value: [] },
  },
  methods: {
    onChoose(e) {
      this.triggerEvent('choose', { index: e.currentTarget.dataset.index });
    },
  },
});
