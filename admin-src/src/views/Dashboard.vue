<template>
  <div>
    <div class="page-head">
      <div>
        <h1>数据看板</h1>
        <p>教师认证、年审及工作室最新变动总览</p>
      </div>
    </div>

    <div class="kpi-grid">
      <div v-for="card in cards" :key="card.title" class="kpi-card">
        <span>{{ card.title }}</span>
        <strong>{{ card.value }}</strong>
        <em>{{ card.change }}</em>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="panel chart-panel">
        <div class="panel-title">
          <h2>年审趋势统计</h2>
          <small><i class="dot green"></i>已完成 <i class="dot gold"></i>待完成</small>
        </div>
        <div class="chart">
          <svg preserveAspectRatio="none" viewBox="0 0 440 200" aria-hidden="true">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#5D7261" stop-opacity="0.2" />
                <stop offset="100%" stop-color="#5D7261" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g class="grid-lines">
              <line x1="0" y1="40" x2="440" y2="40" />
              <line x1="0" y1="80" x2="440" y2="80" />
              <line x1="0" y1="120" x2="440" y2="120" />
              <line x1="0" y1="160" x2="440" y2="160" />
            </g>
            <polygon :points="areaPoints" fill="url(#chartGrad)" />
            <polyline :points="linePoints" fill="none" stroke="#5D7261" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle v-for="(pt, i) in chartPoints" :key="i" :cx="pt.x" :cy="pt.y" r="3.5" fill="#5D7261" />
          </svg>
          <div class="month-axis">
            <span v-for="month in months" :key="month">{{ month }}</span>
          </div>
        </div>
      </section>

      <div class="dashboard-side">
        <section class="panel">
          <div class="panel-title">
            <h2><span class="clock-mark">&#9719;</span>待处理事项</h2>
            <small>实时更新</small>
          </div>
          <div class="task-list">
            <div v-if="pendingReviews > 0" class="task-card">
              <div>
                <strong>{{ pendingReviews }} 位导师待审核</strong>
                <span>请尽快完成审核</span>
              </div>
              <span class="status-pill blue">待审</span>
            </div>
            <div v-else class="task-card neutral">
              <div>
                <strong>没有待审核导师</strong>
                <span>所有审核已完成</span>
              </div>
              <span class="status-pill">已清零</span>
            </div>
          </div>
        </section>

        <section class="panel latest-panel">
          <div class="panel-title">
            <h2>最近认证导师</h2>
            <small>最新上传</small>
          </div>
          <div class="latest-list">
            <div v-for="(teacher, index) in latestTeachers" :key="index" class="latest-row">
              <span>{{ index + 1 }}</span>
              <strong>{{ teacher.name }}</strong>
              <em>{{ teacher.date }}</em>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchDashboardCards, fetchAnalytics } from '../api/adminData'

const cards = ref([
  { title: '教师总数', value: '-', change: '加载中' },
  { title: '待审核人数', value: '-', change: '加载中' },
  { title: '即将到期', value: '-', change: '加载中' },
  { title: '已完成年审', value: '-', change: '加载中' },
])

const analytics = ref(null)
const pendingReviews = ref(0)
const latestTeachers = ref([])

const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const chartPoints = computed(() => {
  const raw = analytics.value?.monthlyTrend || []
  if (raw.length === 0) return []
  const trend = raw.map((item) => (typeof item === 'object' ? item.count || 0 : item))
  const max = Math.max(...trend, 1)
  const width = 440
  const height = 200
  const padding = 10
  return trend.map((val, i) => ({
    x: padding + (i * (width - 2 * padding)) / (trend.length - 1),
    y: height - padding - ((val / max) * (height - 2 * padding)),
  }))
})

const linePoints = computed(() => {
  return chartPoints.value.map((pt) => `${pt.x},${pt.y}`).join(' ')
})

const areaPoints = computed(() => {
  const pts = chartPoints.value
  if (pts.length === 0) return ''
  const bottom = 200
  const first = pts[0]
  const last = pts[pts.length - 1]
  const line = pts.map((pt) => `${pt.x},${pt.y}`).join(' ')
  return `${first.x},${bottom} ${line} ${last.x},${bottom}`
})

onMounted(async () => {
  try {
    const cardsData = await fetchDashboardCards()
    cards.value = cardsData
    pendingReviews.value = parseInt(cardsData[1]?.value) || 0
  } catch (err) {
    console.warn('Dashboard cards fetch failed, using defaults', err)
  }

  try {
    const data = await fetchAnalytics()
    analytics.value = data
    latestTeachers.value = (data.latestTeachers || []).map((t) => ({
      name: t.name,
      date: t.certifiedAt || t.date || '',
    }))
  } catch (err) {
    console.warn('Analytics fetch failed', err)
  }
})
</script>

<style scoped>
.page-head h1 {
  margin: 0;
  font-family: "Noto Serif SC", serif;
  font-size: 24px;
}

.page-head p {
  margin: 6px 0 0;
  color: #9aa1a8;
  font-size: 13px;
}
</style>
