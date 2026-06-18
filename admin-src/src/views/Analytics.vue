<template>
  <div>
    <div class="page-head">
      <div>
        <h1>数据分析</h1>
        <p>观察教师认证、年审完成率、工作室覆盖城市与近期增长趋势。</p>
      </div>
      <button class="sync-btn">导出月报</button>
    </div>

    <section class="kpi-grid">
      <div class="kpi-card">
        <span>认证转化率</span>
        <strong>78.4%</strong>
        <em>+6.2%</em>
      </div>
      <div class="kpi-card">
        <span>年审准时率</span>
        <strong>92.1%</strong>
        <em>+3.4%</em>
      </div>
      <div class="kpi-card">
        <span>覆盖城市</span>
        <strong>12</strong>
        <em>+2</em>
      </div>
      <div class="kpi-card">
        <span>工作室预约</span>
        <strong>486</strong>
        <em>+18%</em>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="panel">
        <div class="panel-title">
          <h2>等级分布</h2>
          <small><span class="dot green"></span> 当前教师库</small>
        </div>
        <div class="rank-bars">
          <div v-for="item in levels" :key="item.name">
            <span>{{ item.name }}</span>
            <strong :style="{ width: item.percent + '%' }"></strong>
            <em>{{ item.count }} 人</em>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <h2>城市热度</h2>
        </div>
        <div class="latest-list">
          <div v-for="city in cities" :key="city.name" class="latest-row">
            <span>{{ city.rank }}</span>
            <strong>{{ city.name }}</strong>
            <em>{{ city.count }} 位教师</em>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const levels = [
  { name: 'L1 见习导师', count: 326, percent: 38 },
  { name: 'L2 认证导师', count: 514, percent: 62 },
  { name: 'L3 高级导师', count: 286, percent: 46 },
  { name: 'L4 导师培训师', count: 72, percent: 22 },
]

const cities = [
  { rank: 1, name: '上海市', count: 286 },
  { rank: 2, name: '北京市', count: 214 },
  { rank: 3, name: '杭州市', count: 168 },
  { rank: 4, name: '广州市', count: 122 },
]
</script>
