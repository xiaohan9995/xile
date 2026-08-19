<template>
  <div class="pagination" aria-label="分页">
    <button class="pagination-btn" :disabled="currentPage <= 1" @click="$emit('update:currentPage', currentPage - 1)">‹</button>
    <button
      v-for="page in displayPages"
      :key="page"
      class="pagination-btn"
      :class="{ 'pagination-btn--active': page === currentPage }"
      @click="$emit('update:currentPage', page)"
    >{{ page }}</button>
    <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="$emit('update:currentPage', currentPage + 1)">›</button>
    <span class="pagination-info">共 {{ totalItems }} 条</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalItems: { type: Number, required: true },
})

defineEmits(['update:currentPage'])

const displayPages = computed(() => {
  const start = Math.max(1, props.currentPage - 2)
  const end = Math.max(1, Math.min(props.totalPages, props.currentPage + 2))
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})
</script>
