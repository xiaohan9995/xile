<template>
  <div>
    <div class="page-head">
      <div>
        <h1>数据看板</h1>
        <p>系统合作瑜伽导师执勤、年审及工作室最新变动总览。</p>
      </div>
      <button class="sync-btn">↻ 实时通讯同步</button>
    </div>

    <div class="kpi-grid">
      <div v-for="card in cards" :key="card.title" class="kpi-card">
        <span>{{ card.title }}</span>
        <strong>{{ card.value }}</strong>
        <em :class="{ muted: card.muted }">{{ card.change }}</em>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="panel chart-panel">
        <div class="panel-title">
          <h2>年审趋势统计</h2>
          <small><i class="dot green"></i>已完成 <i class="dot gold"></i>待完成</small>
        </div>
        <div class="chart">
          <svg preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#5D7261" stop-opacity="0.2" />
                <stop offset="100%" stop-color="#5D7261" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g class="grid-lines">
              <line v-for="y in [18, 32, 46, 60, 74]" :key="y" x1="0" :y1="y" x2="100" :y2="y" />
            </g>
            <path d="M0 62 C13 56 23 50 33 39 C45 26 55 59 63 70 C71 81 78 64 84 32 C89 11 97 18 100 24 L100 100 L0 100 Z" fill="url(#chartGrad)" />
            <path d="M0 62 C13 56 23 50 33 39 C45 26 55 59 63 70 C71 81 78 64 84 32 C89 11 97 18 100 24" fill="none" stroke="#5D7261" stroke-width="3" stroke-linecap="round" />
            <ellipse cx="33" cy="39" rx="4.3" ry="2.3" fill="#BBA178" />
            <ellipse cx="83" cy="32" rx="3.9" ry="2.2" fill="#5D7261" />
            <ellipse cx="100" cy="24" rx="4.2" ry="2.2" fill="#5D7261" />
          </svg>
          <div class="month-axis">
            <span v-for="month in months" :key="month">{{ month }}</span>
          </div>
        </div>
      </section>

      <div class="dashboard-side">
        <section class="panel">
          <div class="panel-title">
            <h2><span class="clock-mark">◷</span>待处理事项</h2>
            <small>实时更新</small>
          </div>
          <div class="task-list">
            <div class="task-card neutral">
              <div>
                <strong>没有待审核注册导师</strong>
                <span>可在左侧模拟注册后提交</span>
              </div>
              <span class="status-pill">已清零</span>
            </div>
            <div class="task-card">
              <div>
                <strong>有 7 位名师即将到期</strong>
                <span>证书效力低于30天</span>
              </div>
              <span class="status-pill blue">催审</span>
            </div>
          </div>
        </section>

        <section class="panel latest-panel">
          <div class="panel-title">
            <h2>最近上传认证导师</h2>
            <small>查看更多</small>
          </div>
          <div class="latest-list">
            <div v-for="(teacher, index) in latestTeachers" :key="teacher.name" class="latest-row">
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
import { onMounted, ref } from 'vue'
import { fetchDashboardCards } from '../api/adminData.js'

const cards = ref([
  { title: '教师总数', value: '1286', change: '↗ +36 较上月' },
  { title: '待审核人数', value: '0', change: '↘ 0 暂无挂起', muted: true },
  { title: '即将到期', value: '72', change: '↘ -8 较上月', muted: true },
  { title: '已完成年审', value: '326', change: '↗ +28 较上月' },
])

onMounted(async () => {
  try {
    cards.value = await fetchDashboardCards()
  } catch (error) {
    console.warn('数据看板接口暂不可用，保留本地演示数据', error)
  }
})

const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const latestTeachers = [
  { name: '张三', date: '2023年01月04日' },
  { name: '李四', date: '2023年03月15日' },
  { name: '张五', date: '2023年05月22日' },
]
</script>
