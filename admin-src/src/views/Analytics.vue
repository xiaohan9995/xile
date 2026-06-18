<template>
  <div>
    <div class="page-head">
      <div>
        <h1>数据分析</h1>
        <p>教师认证数据统计与分析</p>
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom: 24px">
      <div class="kpi-card">
        <span>认证教师总数</span>
        <strong>{{ analytics.totalTeachers ?? 0 }}</strong>
      </div>
      <div class="kpi-card">
        <span>活跃占比</span>
        <strong>{{ analytics.activeRate ?? 0 }}%</strong>
      </div>
      <div class="kpi-card">
        <span>覆盖城市</span>
        <strong>{{ analytics.totalCities ?? 0 }}</strong>
      </div>
      <div class="kpi-card">
        <span>等级数</span>
        <strong>{{ (analytics.tierDistribution || []).length }}</strong>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="panel">
        <div class="panel-title">
          <h2>等级分布</h2>
        </div>
        <div class="rank-bars">
          <div v-for="item in analytics.tierDistribution || []" :key="item.tier">
            <span>{{ item.tier }}</span>
            <strong :style="{ width: item.percent + '%' }"></strong>
            <em>{{ item.count }} 人 ({{ item.percent }}%)</em>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <h2>城市热力排名</h2>
        </div>
        <div class="rank-bars">
          <div v-for="item in analytics.cityDistribution || []" :key="item.city">
            <span>{{ item.city }}</span>
            <strong :style="{ width: item.percent + '%' }"></strong>
            <em>{{ item.count }} 人 ({{ item.percent }}%)</em>
          </div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top: 24px">
      <div class="panel-title">
        <h2>年审趋势（近12月）</h2>
      </div>
      <div class="chart">
        <svg viewBox="0 0 440 160" preserveAspectRatio="none">
          <g class="grid-lines">
            <line v-for="i in 4" :key="i" x1="0" :y1="i * 32" x2="440" :y2="i * 32" />
          </g>
          <polygon :points="areaPoints" fill="rgba(93,114,97,0.12)" />
          <polyline :points="linePoints" fill="none" stroke="#5d7261" stroke-width="2" />
          <circle v-for="(p, i) in pointCoords" :key="i" :cx="p.x" :cy="p.y" r="3" fill="#5d7261" />
        </svg>
        <div class="month-axis">
          <span v-for="item in analytics.monthlyTrend || []" :key="item.month">{{ item.month.slice(5) }}月</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchAnalytics } from '../api/adminData'

const analytics = ref({})

onMounted(async () => {
  try {
    analytics.value = await fetchAnalytics()
  } catch (e) { /* fallback to empty */ }
})

const pointCoords = computed(() => {
  const trend = analytics.value.monthlyTrend || []
  if (!trend.length) return []
  const max = Math.max(...trend.map(t => t.count), 1)
  return trend.map((t, i) => ({
    x: (i / Math.max(trend.length - 1, 1)) * 420 + 10,
    y: 150 - (t.count / max) * 140,
  }))
})

const linePoints = computed(() => pointCoords.value.map(p => `${p.x},${p.y}`).join(' '))

const areaPoints = computed(() => {
  const pts = pointCoords.value
  if (!pts.length) return ''
  return `${pts[0].x},150 ` + pts.map(p => `${p.x},${p.y}`).join(' ') + ` ${pts[pts.length - 1].x},150`
})
</script>

<style scoped>
</style>
