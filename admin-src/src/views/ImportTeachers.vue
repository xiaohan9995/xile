<template>
  <div>
    <div class="page-head">
      <div>
        <h1>教师批量导入</h1>
        <p>上传 Excel 后进行字段预检、重复编号校验和导入批次记录。</p>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-title">
          <h2>导入预检</h2>
          <small>{{ stateLabel }}</small>
        </div>

        <!-- Idle: drop zone -->
        <div
          v-if="state === 'idle' || state === 'uploading'"
          class="import-drop"
          :class="{ dragging: isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
        >
          <strong v-if="state === 'uploading'">正在上传解析中...</strong>
          <template v-else>
            <strong>将教师资料 Excel 拖拽到这里</strong>
            <span>支持 .xlsx 格式，字段以客户年审表为准</span>
          </template>
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx"
            style="display: none"
            @change="handleFileSelect"
          />
        </div>

        <!-- Preview: results -->
        <div v-if="state === 'preview' || state === 'committing'" class="import-preview">
          <div class="preview-summary">
            <div class="preview-stat">
              <span>总行数</span>
              <strong>{{ preview.totalRows }}</strong>
            </div>
            <div class="preview-stat">
              <span>有效行数</span>
              <strong class="valid">{{ preview.validRows }}</strong>
            </div>
            <div class="preview-stat">
              <span>错误数</span>
              <strong class="error">{{ preview.errors.length }}</strong>
            </div>
          </div>

          <div v-if="preview.errors.length > 0" class="error-table-wrap">
            <table class="data-table error-table">
              <thead>
                <tr>
                  <th>行号</th>
                  <th>字段</th>
                  <th>错误信息</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(err, idx) in preview.errors" :key="idx" class="error-row">
                  <td>{{ err.rowNumber }}</td>
                  <td>{{ err.field }}</td>
                  <td>{{ err.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="import-actions">
            <button class="sync-btn" @click="resetState">重新上传</button>
            <button
              class="primary-btn"
              :disabled="state === 'committing'"
              @click="handleCommit"
            >
              {{ state === 'committing' ? '导入中...' : '确认导入' }}
            </button>
          </div>
        </div>

        <!-- Done: success -->
        <div v-if="state === 'done'" class="import-done">
          <div class="empty-check">✓</div>
          <h2>导入完成</h2>
          <p>成功创建 {{ result.createdCount }} 条教师记录。</p>
          <button class="primary-btn" @click="resetState">继续导入</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { uploadImportPreview, commitImport } from '../api/adminData'

const state = ref('idle') // idle | uploading | preview | committing | done
const isDragging = ref(false)
const fileInputRef = ref(null)
const selectedFile = ref(null)
const preview = ref({ totalRows: 0, validRows: 0, errors: [] })
const result = ref({ createdCount: 0 })
const batchId = ref(null)

const stateLabel = computed(() => {
  const labels = {
    idle: '等待文件上传',
    uploading: '正在解析...',
    preview: '预检完成，请确认',
    committing: '正在导入...',
    done: '导入成功',
  }
  return labels[state.value] || ''
})

function triggerFileInput() {
  if (state.value !== 'idle') return
  fileInputRef.value?.click()
}

function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) processFile(file)
}

function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files?.[0]
  if (file && file.name.endsWith('.xlsx')) {
    processFile(file)
  }
}

async function processFile(file) {
  selectedFile.value = file
  state.value = 'uploading'
  try {
    const res = await uploadImportPreview(file)
    preview.value = {
      totalRows: res.totalRows || 0,
      validRows: res.validRows || 0,
      errors: res.errors || [],
    }
    batchId.value = res.batchId
    state.value = 'preview'
  } catch (error) {
    console.warn('预检接口调用失败', error)
    state.value = 'idle'
  }
}

async function handleCommit() {
  if (!batchId.value || !selectedFile.value) return
  state.value = 'committing'
  try {
    const res = await commitImport(batchId.value, selectedFile.value)
    result.value = { createdCount: res.createdCount || 0 }
    state.value = 'done'
  } catch (error) {
    console.warn('导入提交失败', error)
    state.value = 'preview'
  }
}

function resetState() {
  state.value = 'idle'
  selectedFile.value = null
  preview.value = { totalRows: 0, validRows: 0, errors: [] }
  result.value = { createdCount: 0 }
  batchId.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}
</script>

<style scoped>
.import-drop {
  min-height: 260px;
  border: 1px dashed rgba(93, 114, 97, 0.35);
  border-radius: 24px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  background: #fafcfb;
  color: #5d7261;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.import-drop.dragging {
  border-color: var(--brand-green);
  background: var(--brand-green-light);
}

.import-drop span {
  color: #9aa1a8;
  font-size: 13px;
}

.import-preview {
  display: grid;
  gap: 20px;
}

.preview-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.preview-stat {
  padding: 16px;
  border: 1px solid #eef0ee;
  border-radius: 18px;
  background: #fbfcfb;
}

.preview-stat span {
  display: block;
  color: #9aa1a8;
  font-size: 12px;
  font-weight: 800;
}

.preview-stat strong {
  display: block;
  margin-top: 8px;
  font-family: "JetBrains Mono", monospace;
  font-size: 22px;
  color: #1f2937;
}

.preview-stat strong.valid {
  color: #059669;
}

.preview-stat strong.error {
  color: #dc2626;
}

.error-table-wrap {
  border: 1px solid #fecaca;
  border-radius: 18px;
  overflow: hidden;
}

.error-table th {
  background: #fef2f2;
  color: #991b1b;
}

.error-row td {
  color: #991b1b;
  background: #fff5f5;
}

.import-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.import-done {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.import-done h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
}

.import-done p {
  margin: 0;
  color: #8da0bf;
  font-size: 13px;
}
</style>
