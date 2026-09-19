<script setup>
defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
  count: { type: Number, default: null },
  changed: { type: Boolean, default: false },
})
</script>

<template>
  <div class="diff-field" :class="{ 'diff-field--changed': changed }">
    <span class="diff-field__label">{{ label }}</span>
    <span class="diff-field__value">{{ value != null && value !== '' ? value : (count != null ? count + ' 张' : '—') }}</span>
  </div>
</template>

<style scoped>
.diff-field {
  display: flex;
  gap: 10px;
  padding: 6px 0;
  font-size: 13px;
}
.diff-field__label {
  flex-shrink: 0;
  width: 64px;
  color: #8a948d;
}
.diff-field__value {
  color: #1f2521;
  /* 多行文本按段落渲染，保留换行与空行间距 */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.diff-field--changed .diff-field__value {
  color: #9c7a1a;
  font-weight: 600;
}
</style>
