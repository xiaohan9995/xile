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
            <input v-model="createDraft.city" readonly placeholder="请通过地图选点" />
          </label>
          <label>
            地区
            <input v-model="createDraft.district" readonly placeholder="请通过地图选点" />
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
          <input v-model="createDraft.address" readonly placeholder="请通过地图选点" />
        </label>
        <button type="button" class="sync-btn map-pick-btn" @click="requestMapPicker(createDraft)">地图选点并自动填写地址</button>
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
            <input v-model="editDraft.city" readonly placeholder="请通过地图选点" />
          </label>
          <label>
            地区
            <input v-model="editDraft.district" readonly placeholder="请通过地图选点" />
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
          <input v-model="editDraft.address" readonly placeholder="请通过地图选点" />
        </label>
        <button type="button" class="sync-btn map-pick-btn" @click="requestMapPicker(editDraft)">重新地图选点</button>
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
            <p class="map-picker-hint">搜索或点击地图选择位置，确认后自动回填城市、地区和地址</p>
          </div>
          <button type="button" @click="closeMapPicker">×</button>
        </div>
        <div class="map-search-row">
          <input v-model="mapSearchKeyword" placeholder="搜索地址、写字楼或地标" @keyup.enter="searchMapLocations" />
          <button type="button" class="sync-btn" :disabled="mapSearching" @click="searchMapLocations">{{ mapSearching ? '搜索中…' : '搜索' }}</button>
        </div>
        <div v-if="mapSearchResults.length" class="map-search-results">
          <button v-for="item in mapSearchResults" :key="`${item.latitude}-${item.longitude}`" type="button" @click="selectMapResult(item)">
            <strong>{{ item.title }}</strong>
            <span>{{ item.address || [item.city, item.district].filter(Boolean).join(' ') }}</span>
          </button>
        </div>
        <div v-if="!mapKey" class="map-picker-empty">尚未配置腾讯地图 Web Key，请联系管理员配置。</div>
        <div v-else ref="mapContainer" class="map-container"></div>
        <div v-if="mapLoadError" class="map-load-error">{{ mapLoadError }}</div>
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
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import ImagePreview from '../components/ImagePreview.vue'
import { fetchAdminStudios, fetchMapConfig, searchMapPlaces, reverseGeocodeMapLocation, createStudio, updateStudio, deleteStudio, uploadAdminAsset } from '../api/adminData'
import { useToast } from '../composables/useToast'
import Pagination from '../components/Pagination.vue'

const { show: toast } = useToast()
const filters = ref({ name: '', city: '', address: '', tags: '' })
const showCreate = ref(false)
const showEdit = ref(false)
const studios = ref([])
const currentPage = ref(1)
const pageSize = 15
const mapKey = ref(import.meta.env.VITE_TENCENT_MAP_KEY || '')
const showMapPicker = ref(false)
const mapContainer = ref(null)
const mapTarget = ref(null)
const pickedPoint = ref(null)
const pickedPlace = ref(null)
const mapSearchKeyword = ref('')
const mapSearchResults = ref([])
const mapSearching = ref(false)
const mapLoadError = ref('')
let mapInstance = null
let mapMarker = null
let mapScriptPromise = null
let mapRenderTimer = null

const pickedCoordinateText = computed(() => {
  if (!pickedPoint.value) return '未选择'
  return `${pickedPoint.value.latitude.toFixed(6)}, ${pickedPoint.value.longitude.toFixed(6)}`
})

function loadTencentMap() {
  if (window.TMap) return Promise.resolve(window.TMap)
  if (mapScriptPromise) return mapScriptPromise
  mapScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${encodeURIComponent(mapKey.value)}`
    script.onload = () => (window.TMap ? resolve(window.TMap) : reject(new Error('腾讯地图脚本加载失败')))
    script.onerror = () => reject(new Error('腾讯地图脚本加载失败'))
    document.head.appendChild(script)
  })
  mapScriptPromise.catch(() => { mapScriptPromise = null })
  return mapScriptPromise
}

function requestMapPicker(target) {
  const hasLocation = Boolean(target.latitude || target.longitude || target.address)
  if (target === editDraft && hasLocation && !window.confirm('重新选点将覆盖当前城市、地区和地址，是否继续？')) return
  openMapPicker(target)
}

async function openMapPicker(target) {
  if (!mapKey.value) {
    toast('请先配置腾讯地图 Web Key')
    return
  }
  mapTarget.value = target
  pickedPlace.value = null
  mapSearchKeyword.value = target.address || ''
  mapSearchResults.value = []
  mapLoadError.value = ''
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
    mapInstance.on('tilesloaded', () => {
      if (mapRenderTimer) clearTimeout(mapRenderTimer)
      mapRenderTimer = null
      mapLoadError.value = ''
    })
    mapRenderTimer = window.setTimeout(() => {
      mapLoadError.value = '地图未能加载。请确认腾讯地图 Key 已开通 JavaScript API GL，并将当前后台域名加入 Referer 白名单。'
    }, 7000)
    mapMarker = new TMap.MultiMarker({
      map: mapInstance,
      styles: { marker: new TMap.MarkerStyle({ width: 24, height: 30, anchor: { x: 12, y: 30 } }) },
      geometries: [{ id: 'studio-location', position: new TMap.LatLng(latitude, longitude) }],
    })
    mapInstance.on('click', async (event) => {
      const point = { latitude: event.latLng.getLat(), longitude: event.latLng.getLng() }
      pickedPoint.value = point
      pickedPlace.value = null
      mapMarker.setGeometries([{ id: 'studio-location', position: new TMap.LatLng(point.latitude, point.longitude) }])
      try {
        pickedPlace.value = await reverseGeocodeMapLocation(point.latitude, point.longitude)
      } catch (error) {
        toast(error?.response?.data?.error || '坐标已选中，但地址解析失败', 'error')
      }
    })
  } catch (error) {
    toast('地图加载失败，请检查 Key 和域名白名单')
    closeMapPicker()
  }
}

async function searchMapLocations() {
  const keyword = mapSearchKeyword.value.trim()
  if (!keyword) {
    toast('请输入要搜索的地址或地点')
    return
  }
  mapSearching.value = true
  try {
    const result = await searchMapPlaces(keyword, mapTarget.value?.city || '')
    mapSearchResults.value = result.items || []
    if (!mapSearchResults.value.length) toast('未找到匹配地点，请尝试更完整的地址')
  } catch (error) {
    toast(error?.response?.data?.error || '地点搜索失败，请检查腾讯地图 Key 配置', 'error')
  } finally {
    mapSearching.value = false
  }
}

function selectMapResult(item) {
  const latitude = Number(item.latitude)
  const longitude = Number(item.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
  pickedPoint.value = { latitude, longitude }
  pickedPlace.value = item
  mapSearchKeyword.value = item.title
  mapSearchResults.value = []
  const TMap = window.TMap
  if (mapInstance && TMap) {
    const position = new TMap.LatLng(latitude, longitude)
    mapInstance.setCenter(position)
    mapInstance.setZoom(16)
    mapMarker.setGeometries([{ id: 'studio-location', position }])
  }
}

function confirmMapPicker() {
  if (!mapTarget.value || !pickedPoint.value) return
  mapTarget.value.latitude = pickedPoint.value.latitude
  mapTarget.value.longitude = pickedPoint.value.longitude
  if (pickedPlace.value) {
    mapTarget.value.city = pickedPlace.value.city || mapTarget.value.city
    mapTarget.value.district = pickedPlace.value.district || mapTarget.value.district
    mapTarget.value.address = pickedPlace.value.address || pickedPlace.value.title
  }
  closeMapPicker()
}

function closeMapPicker() {
  showMapPicker.value = false
  if (mapRenderTimer) clearTimeout(mapRenderTimer)
  mapRenderTimer = null
  if (mapInstance) mapInstance.destroy()
  mapInstance = null
  mapMarker = null
  mapTarget.value = null
  pickedPlace.value = null
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

onMounted(() => {
  loadStudios()
  loadMapKey()
})

async function loadMapKey() {
  if (mapKey.value) return
  try {
    const config = await fetchMapConfig()
    mapKey.value = config.key || ''
  } catch (error) {
    console.warn('获取腾讯地图配置失败', error)
  }
}

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
  if (!createDraft.latitude || !createDraft.longitude || !createDraft.address) {
    toast('请先通过地图选点填写工作室地址', 'error')
    return
  }
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
  if (!editDraft.latitude || !editDraft.longitude || !editDraft.address) {
    toast('请先通过地图选点填写工作室地址', 'error')
    return
  }
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
