<template>
  <div>
    <div class="page-head">
      <div>
        <h1>权限管理</h1>
        <p>配置教师管理委员会成员的审核、导入、工作室维护和系统配置权限。</p>
      </div>
      <button class="primary-btn">＋ 邀请管理员</button>
    </div>

    <div class="data-table-wrap roster-wrap">
      <table class="data-table roster-table">
        <thead>
          <tr>
            <th>成员</th>
            <th>角色</th>
            <th>权限范围</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.name">
            <td>
              <div class="cell-person compact">
                <img :src="member.avatar" :alt="member.name" />
                <div>
                  <strong>{{ member.name }}</strong>
                  <span>{{ member.email }}</span>
                </div>
              </div>
            </td>
            <td><span class="level-text">{{ member.role }}</span></td>
            <td>{{ member.scope }}</td>
            <td><span class="status-pill">{{ member.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
const members = [
  {
    name: '管理员',
    email: 'admin@joyyoga.cn',
    role: '超级管理员',
    scope: '全部数据、审核、导入、配置',
    status: '启用中',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
  },
  {
    name: '年审专员',
    email: 'review@joyyoga.cn',
    role: '审核管理员',
    scope: '年审队列、材料核验、证书发放',
    status: '启用中',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=200&auto=format&fit=crop',
  },
]
</script>
