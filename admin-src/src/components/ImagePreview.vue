<template>
  <template>
  <>
    <img :src="src" :alt="alt" :class="imageClass" class="preview-trigger" @click.stop="open = true" />
    <div v-if="open" class="image-preview-backdrop" @click="open = false">
      <div class="image-preview-dialog" @click.stop>
        <button class="image-preview-close" type="button" aria-label="关闭预览" @click="open = false">×</button>
        <img :src="src" :alt="alt" class="image-preview-large" />
      </div>
    </div>
  </template>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  imageClass: { type: String, default: '' },
})

const open = ref(false)
</script>

<style scoped>
.preview-trigger { cursor: zoom-in; }
.image-preview-backdrop { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 32px; background: rgba(15, 24, 18, .72); }
.image-preview-dialog { position: relative; max-width: min(90vw, 900px); max-height: 90vh; padding: 12px; border-radius: 14px; background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
.image-preview-large { display: block; max-width: 86vw; max-height: 84vh; object-fit: contain; border-radius: 8px; }
.image-preview-close { position: absolute; top: -14px; right: -14px; width: 32px; height: 32px; border: 0; border-radius: 50%; background: #fff; color: #26362b; font-size: 24px; line-height: 1; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
</style>
