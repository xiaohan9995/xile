<template>
  <div>
    <div class="page-head">
      <div>
        <h1>系统设置</h1>
        <p>管理年审规则与系统功能配置</p>
      </div>
      <button class="primary-btn" @click="handleSave">保存配置</button>
    </div>

    <div class="settings-grid">
      <div class="panel">
        <div class="panel-title">
          <h2>年审规则配置</h2>
        </div>
        <div class="settings-list">
          <label v-for="tier in tiers" :key="tier.code">
            {{ tier.code }} {{ tier.name }} — 年审周期
            <input
              v-model.number="tier.reviewCycleYears"
              type="number"
              min="1"
              max="10"
              :placeholder="tier.reviewRequired ? '年' : '免审'"
              :disabled="!tier.reviewRequired"
            />
          </label>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <h2>功能开关</h2>
        </div>
        <div class="settings-list">
          <label class="toggle-row">
            <span>启用防伪二维码联动实时检验</span>
            <input type="checkbox" v-model="features.qrVerifyEnabled" />
          </label>
          <label class="toggle-row">
            <span>资质证书到期前自动微信消息提醒</span>
            <input type="checkbox" v-model="features.certExpiryNotify" />
          </label>
        </div>
      </div>
    </div>

    <p v-if="saveMsg" class="save-msg">{{ saveMsg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchSettings, saveSettings } from '../api/adminData'

const tiers = ref([])
const features = ref({ qrVerifyEnabled: true, certExpiryNotify: true })
const saveMsg = ref('')

onMounted(async () => {
  try {
    const data = await fetchSettings()
    tiers.value = data.tiers || []
    features.value = data.features || { qrVerifyEnabled: true, certExpiryNotify: true }
  } catch (e) { /* fallback */ }
})

async function handleSave() {
  try {
    await saveSettings({ tiers: tiers.value, features: features.value })
    saveMsg.value = '配置已保存'
    setTimeout(() => { saveMsg.value = '' }, 2000)
  } catch (e) {
    saveMsg.value = '保存失败，请重试'
  }
}
</script>

<style scoped>
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #eef0ee;
}
.toggle-row span {
  color: #4b5563;
  font-size: 13px;
  font-weight: 600;
}
.toggle-row input[type="checkbox"] {
  width: 40px;
  height: 22px;
  accent-color: #5d7261;
}
.save-msg {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #059669;
  font-size: 13px;
  font-weight: 600;
}
</style>
