<template>
  <div class="banners-page">
    <div class="page-head">
      <div>
        <h1>首图设置</h1>
        <p>设置小程序首页与工作室列表页的顶部首图，保存后立即生效</p>
      </div>
      <button class="primary-btn" :disabled="isLoading || isSaving" @click="handleSave">
        {{ isSaving ? '保存中…' : '保存首图' }}
      </button>
    </div>

    <section v-if="loadError" class="banners-state banners-state--error" role="alert">
      <strong>首图配置加载失败</strong>
      <span>{{ loadError }}</span>
      <button type="button" class="text-btn" @click="load">重新加载</button>
    </section>

    <section v-else class="panel banners-panel" aria-label="首图设置">
      <div class="banner-field">
        <div class="banner-field__head">
          <h2>首页首图</h2>
          <p>小程序首页顶部大图</p>
        </div>
        <div class="banner-upload">
          <img v-if="draft.home" class="banner-preview" :src="draft.home" alt="首页首图预览" />
          <div v-else class="banner-preview banner-preview--empty">未设置</div>
          <label class="banner-upload__action" :class="{ 'is-uploading': uploading === 'home' }">
            {{ uploading === 'home' ? '上传中…' : '上传图片' }}
            <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="uploading === 'home'" @change="upload($event, 'home')" />
          </label>
        </div>
      </div>

      <div class="banner-field">
        <div class="banner-field__head">
          <h2>工作室页首图</h2>
          <p>瑜伽工作室列表页顶部大图</p>
        </div>
        <div class="banner-upload">
          <img v-if="draft.studio" class="banner-preview" :src="draft.studio" alt="工作室页首图预览" />
          <div v-else class="banner-preview banner-preview--empty">未设置</div>
          <label class="banner-upload__action" :class="{ 'is-uploading': uploading === 'studio' }">
            {{ uploading === 'studio' ? '上传中…' : '上传图片' }}
            <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="uploading === 'studio'" @change="upload($event, 'studio')" />
          </label>
        </div>
      </div>
    </section>

    <p v-if="saveMsg" class="save-msg" role="status">{{ saveMsg }}</p>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { fetchBanners, saveBanners, uploadAdminAsset } from '../api/adminData'
import { useToast } from '../composables/useToast'

const { show: toast } = useToast()

const draft = reactive({ home: '', studio: '' })
const isLoading = ref(true)
const isSaving = ref(false)
const uploading = ref('')
const loadError = ref('')
const saveMsg = ref('')

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const data = await fetchBanners()
    draft.home = data.home || ''
    draft.studio = data.studio || ''
  } catch (e) {
    loadError.value = e?.message || '请检查网络连接与管理员权限后重试。'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

async function upload(event, slot) {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  const allowed = ['.jpg', '.jpeg', '.png', '.webp']
  const ext = (file.name || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || ''
  if (!allowed.includes(ext)) {
    toast(`「${file.name || '所选文件'}」格式不支持，仅支持 JPG、PNG 和 WebP 图片`, 'error')
    event.target.value = ''
    return
  }
  uploading.value = slot
  try {
    const result = await uploadAdminAsset(file, 'banner')
    draft[slot] = result.url
    toast('图片已上传到对象存储')
  } catch (e) {
    toast(e?.response?.data?.error || e?.message || '图片上传失败，请检查对象存储配置', 'error')
  } finally {
    uploading.value = ''
    event.target.value = ''
  }
}

async function handleSave() {
  isSaving.value = true
  try {
    await saveBanners({ home: draft.home, studio: draft.studio })
    saveMsg.value = '首图已保存，小程序端立即生效'
    setTimeout(() => { saveMsg.value = '' }, 2000)
  } catch (e) {
    saveMsg.value = '保存失败，请重试'
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.banners-panel {
  padding: 22px;
}

.banner-field {
  padding: 18px 0;
  border-bottom: 1px solid #edf0ed;
}

.banner-field:first-child {
  padding-top: 0;
}

.banner-field:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.banner-field__head h2 {
  margin: 0;
  font-family: "Noto Serif SC", serif;
  font-size: 16px;
}

.banner-field__head p {
  margin: 6px 0 0;
  color: #6f7b73;
  font-size: 13px;
}

.banner-upload {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
}

.banner-preview {
  width: 320px;
  height: 128px;
  flex: 0 0 auto;
  border: 1px solid #e3e9e3;
  border-radius: 12px;
  object-fit: cover;
  background: #f5f7f4;
}

.banner-preview--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa69e;
  font-size: 13px;
}

.banner-upload__action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 16px;
  border: 1px solid var(--brand-green, #426d58);
  border-radius: 11px;
  background: var(--brand-green-light, #edf5ef);
  color: var(--brand-green, #426d58);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.banner-upload__action:hover {
  background: #e2efe6;
}

.banner-upload__action.is-uploading {
  opacity: 0.6;
  cursor: not-allowed;
}

.banner-upload__action input[type="file"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.banners-state {
  display: grid;
  gap: 7px;
  min-height: 160px;
  place-content: center;
  color: #718078;
  text-align: center;
  font-size: 13px;
}

.banners-state strong {
  color: #34453a;
  font-size: 14px;
}

.banners-state--error strong {
  color: #b4534d;
}

.text-btn {
  justify-self: center;
  padding: 6px 4px;
  border: 0;
  background: transparent;
  color: #527259;
  font-weight: 800;
  cursor: pointer;
  text-decoration: underline;
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

@media (max-width: 720px) {
  .banner-upload {
    flex-direction: column;
    align-items: flex-start;
  }
  .banner-preview {
    width: 100%;
  }
}
</style>
