Component({
  properties: {
    teacher: { type: Object, value: {} },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { teacher: this.data.teacher });
    },
  },
});
