<template>
  <div>
    <div class="page-head">
      <div>
        <h1>工作室管理</h1>
      </div>
      <button class="primary-btn" @click="openCreate">新增工作室</button>
    </div>

    <div class="toolbar">
      <input v-model="filters.name" placeholder="工作室名称" />
      <input v-model="filters.city" placeholder="城市" />
      <input v-model="filters.address" placeholder="地址" />
      <input v-model="filters.tags" placeholder="标签" />
    </div>

    <div class="data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>工作室</th>
            <th>城市</th>
            <th>地址</th>
            <th>联系方式</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredList.length === 0">
            <td colspan="6" class="empty-row">{{ hasFilters ? '无匹配结果，请调整筛选条件' : '暂无工作室数据' }}</td>
          </tr>
          <tr v-for="studio in pagedList" :key="studio.id">
            <td>
              <div class="studio-cell">
                <ImagePreview :src="studio.image" :alt="studio.name" image-class="studio-cover" />
                <div>
                  <strong>{{ studio.name }}</strong>
                  <span>{{ Array.isArray(studio.tags) ? studio.tags.join(', ') : studio.tags }}</span>
                </div>
              </div>
            </td>
            <td>{{ studio.city }}</td>
            <td>{{ studio.address }}</td>
            <td>{{ studio.contact }}</td>
            <td><span :class="['status-pill', studio.status === 'hidden' ? 'hidden' : '']">{{ studio.status === 'hidden' ? '已隐藏' : '正常' }}</span></td>
            <td class="table-actions">
              <button class="table-action" @click="openEdit(studio)">编辑</button>
              <button class="danger-action" @click="handleDelete(studio)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <Pagination v-model:current-page="currentPage" :total-pages="totalPages" :total-items="filteredList.length" />
    </div>

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <form class="admin-modal wide" @submit.prevent="handleCreate">
        <div class="modal-head">
          <h2>新增工作室</h2>
          <button type="button" @click="showCreate = false">×</button>
        </div>
        <div class="form-grid two">
          <label>
            <span class="field-label">名称 <em>*</em></span>
            <input v-model="createDraft.name" required placeholder="请输入工作室名称" />
          </label>
          <label>
            城市
            <input v-model="createDraft.city" placeholder="请输入城市" />
          </label>
          <label>
            地区
            <input v-model="createDraft.district" placeholder="请输入区/县" />
          </label>
          <label>
            联系方式
            <input v-model="createDraft.contact" placeholder="请输入联系方式" />
          </label>
          <label>
            标签
            <input v-model="createDraft.tags" placeholder="多个标签用逗号分隔" />
          </label>
          <label>
            营业时间
            <input v-model="createDraft.openingHours" placeholder="如 9:00-21:00" />
          </label>
        </div>
        <label>
          地址
          <input v-model="createDraft.address" placeholder="请输入详细地址" />
        </label>
        <div class="form-grid two">
          <label>纬度<input v-model="createDraft.latitude" type="number" step="any" placeholder="如 39.9042" /></label>
          <label>经度<input v-model="createDraft.longitude" type="number" step="any" placeholder="如 116.4074" /></label>
        </div>
        <button type="button" class="sync-btn map-pick-btn" @click="openMapPicker(createDraft)">地图选点</button>
        <label>
          简介
          <input v-model="createDraft.intro" placeholder="请输入工作室简介" />
        </label>
        <label>
          工作室封面
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadStudioAsset($event, createDraft)" />
          <img v-if="createDraft.coverUrl" class="asset-preview" :src="createDraft.coverUrl" alt="工作室封面预览" />
        </label>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showCreate = false">取消</button>
          <button type="submit" class="primary-btn">确认添加</button>
        </div>
      </form>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEdit" class="modal-backdrop" @click.self="showEdit = false">
      <form class="admin-modal wide" @submit.prevent="handleUpdate">
        <div class="modal-head">
          <h2>编辑工作室 — {{ editDraft.name }}</h2>
          <button type="button" @click="showEdit = false">×</button>
        </div>
        <div class="form-grid two">
          <label>
            <span class="field-label">名称 <em>*</em></span>
            <input v-model="editDraft.name" required />
          </label>
          <label>
            城市
            <input v-model="editDraft.city" placeholder="城市" />
          </label>
          <label>
            地区
            <input v-model="editDraft.district" placeholder="区/县" />
          </label>
          <label>
            联系方式
            <input v-model="editDraft.contact" placeholder="联系方式" />
          </label>
          <label>
            标签
            <input v-model="editDraft.tags" placeholder="多个标签用逗号分隔" />
          </label>
          <label>
            营业时间
            <input v-model="editDraft.openingHours" placeholder="如 9:00-21:00" />
          </label>
        </div>
        <label>
          地址
          <input v-model="editDraft.address" placeholder="详细地址" />
        </label>
        <div class="form-grid two">
          <label>纬度<input v-model="editDraft.latitude" type="number" step="any" placeholder="如 39.9042" /></label>
          <label>经度<input v-model="editDraft.longitude" type="number" step="any" placeholder="如 116.4074" /></label>
        </div>
        <button type="button" class="sync-btn map-pick-btn" @click="openMapPicker(editDraft)">地图选点</button>
        <label>
          简介
          <input v-model="editDraft.intro" placeholder="工作室简介" />
        </label>
        <label>
          工作室封面
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadStudioAsset($event, editDraft)" />
          <img v-if="editDraft.coverUrl" class="asset-preview" :src="editDraft.coverUrl" alt="工作室封面预览" />
        </label>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showEdit = false">取消</button>
          <button type="submit" class="primary-btn">保存修改</button>
        </div>
      </form>
    </div>

    <div v-if="showMapPicker" class="modal-backdrop" @click.self="closeMapPicker">
      <div class="admin-modal map-picker-modal">
        <div class="modal-head">
          <div>
            <h2>选择工作室位置</h2>
            <p class="map-picker-hint">点击地图上的位置，确认后自动回填经纬度</p>
          </div>
          <button type="button" @click="closeMapPicker">×</button>
        </div>
        <div v-if="!mapKey" class="map-picker-empty">尚未配置腾讯地图 Web Key，请设置 VITE_TENCENT_MAP_KEY。</div>
        <div v-else ref="mapContainer" class="map-container"></div>
        <div class="map-picker-coords">当前坐标：{{ pickedCoordinateText }}</div>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="closeMapPicker">取消</button>
          <button type="button" class="primary-btn" :disabled="!pickedPoint" @click="confirmMapPicker">确认位置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import ImagePreview from '../components/ImagePreview.vue'
import { fetchAdminStudios, createStudio, updateStudio, deleteStudio, uploadAdminAsset } from '../api/adminData'
import { useToast } from '../composables/useToast'
import Pagination from '../components/Pagination.vue'

const { show: toast } = useToast()
const filters = ref({ name: '', city: '', address: '', tags: '' })
const showCreate = ref(false)
const showEdit = ref(false)
const studios = ref([])
const currentPage = ref(1)
const pageSize = 15
const mapKey = import.meta.env.VITE_TENCENT_MAP_KEY || ''
const showMapPicker = ref(false)
const mapContainer = ref(null)
const mapTarget = ref(null)
const pickedPoint = ref(null)
let mapInstance = null
let mapMarker = null
let mapScriptPromise = null

const pickedCoordinateText = computed(() => {
  if (!pickedPoint.value) return '未选择'
  return `${pickedPoint.value.latitude.toFixed(6)}, ${pickedPoint.value.longitude.toFixed(6)}`
})

function loadTencentMap() {
  if (window.TMap) return Promise.resolve(window.TMap)
  if (mapScriptPromise) return mapScriptPromise
  mapScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${encodeURIComponent(mapKey)}`
    script.onload = () => (window.TMap ? resolve(window.TMap) : reject(new Error('腾讯地图脚本加载失败')))
    script.onerror = reject
    document.head.appendChild(script)
  })
  return mapScriptPromise
}

async function openMapPicker(target) {
  if (!mapKey) {
    toast('请先配置腾讯地图 Web Key')
    return
  }
  mapTarget.value = target
  const latitude = Number(target.latitude) || 39.9042
  const longitude = Number(target.longitude) || 116.4074
  pickedPoint.value = { latitude, longitude }
  showMapPicker.value = true
  await nextTick()
  try {
    const TMap = await loadTencentMap()
    mapInstance = new TMap.Map(mapContainer.value, {
      center: new TMap.LatLng(latitude, longitude),
      zoom: 14,
      viewMode: '2D',
    })
    mapMarker = new TMap.MultiMarker({
      map: mapInstance,
      styles: { marker: new TMap.MarkerStyle({ width: 24, height: 30, anchor: { x: 12, y: 30 } }) },
      geometries: [{ id: 'studio-location', position: new TMap.LatLng(latitude, longitude) }],
    })
    mapInstance.on('click', (event) => {
      const point = { latitude: event.latLng.getLat(), longitude: event.latLng.getLng() }
      pickedPoint.value = point
      mapMarker.setGeometries([{ id: 'studio-location', position: new TMap.LatLng(point.latitude, point.longitude) }])
    })
  } catch (error) {
    toast('地图加载失败，请检查 Key 和域名白名单')
    closeMapPicker()
  }
}

function confirmMapPicker() {
  if (!mapTarget.value || !pickedPoint.value) return
  mapTarget.value.latitude = pickedPoint.value.latitude
  mapTarget.value.longitude = pickedPoint.value.longitude
  closeMapPicker()
}

function closeMapPicker() {
  showMapPicker.value = false
  if (mapInstance) mapInstance.destroy()
  mapInstance = null
  mapMarker = null
  mapTarget.value = null
}

const createDraft = reactive({
  name: '',
  city: '',
  district: '',
  contact: '',
  tags: '',
  address: '',
  intro: '',
  openingHours: '',
  coverUrl: '',
  latitude: '',
  longitude: '',
})

const editDraft = reactive({
  id: null,
  name: '',
  city: '',
  district: '',
  contact: '',
  tags: '',
  address: '',
  intro: '',
  openingHours: '',
  coverUrl: '',
  latitude: '',
  longitude: '',
})

async function loadStudios() {
  try {
    studios.value = await fetchAdminStudios()
  } catch (e) {
    console.warn('获取工作室列表失败', e)
  }
}

onMounted(loadStudios)

const filteredList = computed(() => {
  const matches = (value, query) => !query || String(value || '').toLowerCase().includes(query)
  const name = filters.value.name.trim().toLowerCase()
  const city = filters.value.city.trim().toLowerCase()
  const address = filters.value.address.trim().toLowerCase()
  const tags = filters.value.tags.trim().toLowerCase()
  return studios.value.filter((s) => {
    const tagsText = Array.isArray(s.tags) ? s.tags.join(' ') : s.tags
    return matches(s.name, name) && matches(s.city, city) && matches(s.address, address) && matches(tagsText, tags)
  })
})

const hasFilters = computed(() => Object.values(filters.value).some((value) => value.trim()))

const totalPages = computed(() => Math.ceil(filteredList.value.length / pageSize))
const pagedList = computed(() => filteredList.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
watch(filters, () => { currentPage.value = 1 }, { deep: true })
watch(totalPages, (total) => {
  if (total > 0 && currentPage.value > total) currentPage.value = total
})

function openCreate() {
  createDraft.name = ''
  createDraft.city = ''
  createDraft.district = ''
  createDraft.contact = ''
  createDraft.tags = ''
  createDraft.address = ''
  createDraft.intro = ''
  createDraft.openingHours = ''
  createDraft.coverUrl = ''
  createDraft.latitude = ''
  createDraft.longitude = ''
  showCreate.value = true
}

function openEdit(studio) {
  editDraft.id = studio.id
  editDraft.name = studio.name
  editDraft.city = studio.city || ''
  editDraft.district = studio.district || ''
  editDraft.contact = studio.contact || ''
  editDraft.tags = Array.isArray(studio.tags) ? studio.tags.join(', ') : (studio.tags || '')
  editDraft.address = studio.address || ''
  editDraft.intro = studio.intro || ''
  editDraft.openingHours = studio.openingHours || ''
  editDraft.coverUrl = studio.coverUrl || ''
  editDraft.latitude = studio.latitude ?? ''
  editDraft.longitude = studio.longitude ?? ''
  showEdit.value = true
}

async function handleCreate() {
  await createStudio({
    name: createDraft.name,
    city: createDraft.city,
    district: createDraft.district,
    contact: createDraft.contact,
    tags: createDraft.tags,
    address: createDraft.address,
    intro: createDraft.intro,
    openingHours: createDraft.openingHours,
    coverUrl: createDraft.coverUrl,
    latitude: createDraft.latitude === '' ? null : Number(createDraft.latitude),
    longitude: createDraft.longitude === '' ? null : Number(createDraft.longitude),
  })
  showCreate.value = false
  toast('工作室添加成功')
  await loadStudios()
}

async function handleUpdate() {
  await updateStudio(editDraft.id, {
    name: editDraft.name,
    city: editDraft.city,
    district: editDraft.district,
    contact: editDraft.contact,
    tags: editDraft.tags,
    address: editDraft.address,
    intro: editDraft.intro,
    openingHours: editDraft.openingHours,
    coverUrl: editDraft.coverUrl,
    latitude: editDraft.latitude === '' ? null : Number(editDraft.latitude),
    longitude: editDraft.longitude === '' ? null : Number(editDraft.longitude),
  })
  showEdit.value = false
  toast('工作室信息已更新')
  await loadStudios()
}

async function handleDelete(studio) {
  if (!window.confirm(`确认删除工作室「${studio.name}」？`)) return
  await deleteStudio(studio.id)
  toast('工作室已删除', 'info')
  await loadStudios()
}

async function uploadStudioAsset(event, draft) {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  try {
    const result = await uploadAdminAsset(file, 'studio-cover')
    draft.coverUrl = result.url
    toast('封面已上传到对象存储')
  } catch (e) {
    const message = e?.response?.data?.error || e?.message || '图片上传失败，请检查对象存储配置'
    toast(message === 'image too large, max 8MB' ? '图片大小不能超过 8MB' : message, 'error')
  } finally {
    event.target.value = ''
  }
}
</script>

<style scoped>
.asset-preview {
  display: block;
  width: 180px;
  height: 96px;
  margin-top: 8px;
  border: 1px solid #e3e9e3;
  border-radius: 8px;
  object-fit: cover;
}
</style>
