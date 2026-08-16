<template>
  <div class="certification-rules-page">
    <div class="page-head">
      <div>
        <h1>认证规则</h1>
        <p>设置不同认证等级的证书有效期与下一次年审时间</p>
      </div>
      <button class="primary-btn" :disabled="isLoading || !tiers.length || isSaving" @click="handleSave">
        {{ isSaving ? '保存中…' : '保存规则' }}
      </button>
    </div>

    <section class="rules-intro" aria-labelledby="rules-intro-title">
      <span class="rules-intro__eyebrow">仅超级管理员可配置</span>
      <div>
        <h2 id="rules-intro-title">证书有效期决定年审节奏</h2>
        <p>保存后仅影响后续证书和年审提醒的计算；已正式发布的证书不会被追溯修改。</p>
      </div>
    </section>

    <section class="panel rules-panel" aria-labelledby="rules-title">
      <div class="panel-title rules-panel__title">
        <div>
          <h2 id="rules-title">等级与年审周期</h2>
          <p>年审周期从证书生效日开始计算。</p>
        </div>
      </div>

      <div v-if="isLoading" class="rules-state">正在加载认证规则…</div>
      <div v-else-if="loadError" class="rules-state rules-state--error" role="alert">
        <strong>认证规则加载失败</strong>
        <span>{{ loadError }}</span>
        <button type="button" class="text-btn" @click="loadRules">重新加载</button>
      </div>
      <div v-else-if="!tiers.length" class="rules-state rules-state--empty">
        <strong>暂未找到认证等级</strong>
        <span>请确认数据库迁移和初始数据已完成，再重新加载页面。</span>
        <button type="button" class="text-btn" @click="loadRules">重新加载</button>
      </div>
      <div v-else class="rules-table-wrap">
        <table class="rules-table">
          <thead>
            <tr>
              <th>认证等级</th>
              <th>是否年审</th>
              <th>证书有效期</th>
              <th>下一次年审</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tier in tiers" :key="tier.code">
              <td>
                <strong>{{ tier.code }}</strong>
                <span>{{ tier.name }}</span>
              </td>
              <td><span class="rule-tag" :class="tier.reviewRequired ? 'rule-tag--active' : 'rule-tag--neutral'">{{ tier.reviewRequired ? '需要年审' : '免年审' }}</span></td>
              <td>
                <template v-if="tier.reviewRequired">
                  <label class="cycle-control">
                    <input v-model.number="tier.reviewCycleYears" type="number" min="1" max="10" :aria-label="`${tier.name}证书有效期（年）`" />
                    <span>年</span>
                  </label>
                </template>
                <span v-else class="rule-muted">长期有效</span>
              </td>
              <td class="rule-note">{{ tier.reviewRequired ? `证书生效后 ${tier.reviewCycleYears || '—'} 年进入年审` : '不生成年审任务' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="saveMsg" class="save-msg" role="status">{{ saveMsg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchSettings, saveSettings } from '../api/adminData'

const tiers = ref([])
const saveMsg = ref('')
const loadError = ref('')
const isLoading = ref(true)
const isSaving = ref(false)

async function loadRules() {
  isLoading.value = true
  loadError.value = ''
  try {
    const data = await fetchSettings()
    tiers.value = data.tiers || []
  } catch (e) {
    tiers.value = []
    loadError.value = e?.message || '请检查网络连接与管理员权限后重试。'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadRules)

async function handleSave() {
  if (tiers.value.some((tier) => tier.reviewRequired && (!Number.isInteger(tier.reviewCycleYears) || tier.reviewCycleYears < 1 || tier.reviewCycleYears > 10))) {
    saveMsg.value = '请将需要年审的有效期填写为 1–10 年的整数'
    return
  }
  isSaving.value = true
  try {
    await saveSettings({ tiers: tiers.value })
    saveMsg.value = '认证规则已保存，后续证书将按新规则计算'
    setTimeout(() => { saveMsg.value = '' }, 2000)
  } catch (e) {
    saveMsg.value = '保存失败，请重试'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.rules-intro {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  margin: 0 0 20px;
  padding: 20px 22px;
  border: 1px solid #dfe8df;
  border-radius: 18px;
  background: linear-gradient(110deg, #f2f7f1, #fbfaf5);
}
.rules-intro__eyebrow {
  flex: 0 0 auto;
  margin-top: 3px;
  padding: 5px 8px;
  border-radius: 999px;
  background: #dce9dd;
  color: #456249;
  font-size: 11px;
  font-weight: 800;
}
.rules-intro h2 { margin: 0; font-family: "Noto Serif SC", serif; font-size: 18px; }
.rules-intro p, .rules-panel__title p { margin: 7px 0 0; color: #6f7b73; font-size: 13px; line-height: 1.6; }
.rules-panel__title { margin-bottom: 16px; }
.rules-table-wrap { overflow-x: auto; }
.rules-table { width: 100%; min-width: 650px; border-collapse: collapse; text-align: left; }
.rules-table th { padding: 11px 14px; color: #819087; background: #f5f7f4; font-size: 11px; font-weight: 800; letter-spacing: .04em; }
.rules-table th:first-child { border-radius: 10px 0 0 10px; }
.rules-table th:last-child { border-radius: 0 10px 10px 0; }
.rules-table td { padding: 16px 14px; border-bottom: 1px solid #edf0ed; color: #4a5650; font-size: 13px; }
.rules-table tbody tr:last-child td { border-bottom: 0; }
.rules-table td:first-child strong { display: inline-block; min-width: 30px; color: #5d7261; font-family: "JetBrains Mono", monospace; }
.rules-table td:first-child span { margin-left: 8px; color: #25322a; font-weight: 700; }
.rule-tag { display: inline-flex; padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; }
.rule-tag--active { background: #e9f4eb; color: #397243; }
.rule-tag--neutral { background: #f1f2f1; color: #718078; }
.cycle-control { display: inline-flex; align-items: center; gap: 7px; }
.cycle-control input { width: 56px; height: 34px; box-sizing: border-box; border: 1px solid #d9e0da; border-radius: 9px; padding: 0 8px; color: #33443a; font-weight: 700; text-align: center; }
.cycle-control span, .rule-muted, .rule-note { color: #7b877e; }
.rule-note { line-height: 1.5; }
.rules-state { display: grid; gap: 7px; min-height: 160px; place-content: center; color: #718078; text-align: center; font-size: 13px; }
.rules-state strong { color: #34453a; font-size: 14px; }
.rules-state--error strong { color: #b4534d; }
.text-btn { justify-self: center; padding: 6px 4px; border: 0; background: transparent; color: #527259; font-weight: 800; cursor: pointer; text-decoration: underline; }
.primary-btn:disabled { cursor: not-allowed; opacity: .55; transform: none; box-shadow: none; }
.save-msg {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #059669;
  font-size: 13px;
  font-weight: 600;
}
@media (max-width: 720px) {
  .rules-intro { display: block; }
  .rules-intro__eyebrow { display: inline-flex; margin: 0 0 10px; }
}
</style>
