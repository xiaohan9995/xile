<template>
  <div>
    <div class="page-head">
      <div>
        <h1>工作室管理</h1>
      </div>
      <div class="page-head-actions">
        <button class="refresh-btn" :class="{ 'is-spinning': refreshing }" :disabled="refreshing" @click="refresh">
          <span class="refresh-icon">↻</span>{{ refreshing ? '刷新中…' : '刷新' }}
        </button>
        <button class="primary-btn" @click="openCreate">新增工作室</button>
      </div>
    </div>

    <div class="toolbar">
      <select v-model="filters.status">
        <option value="">全部状态</option>
        <option value="open">已公开</option>
        <option value="pending">待审批</option>
        <option value="hidden">已隐藏</option>
        <option value="incomplete">未提交</option>
      </select>
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
            <th>主理教师</th>
            <th>城市</th>
            <th>地址</th>
            <th>联系方式</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredList.length === 0">
            <td colspan="7" class="empty-row">{{ hasFilters ? '无匹配结果，请调整筛选条件' : '暂无工作室数据' }}</td>
          </tr>
          <tr v-for="studio in pagedList" :key="studio.id">
            <td>
              <div class="studio-cell">
                <ImagePreview :src="studio.image" :alt="studio.name" image-class="studio-cover" />
                <div>
                  <strong>{{ studio.name }}</strong>
                  <span class="studio-cell__tags">{{ Array.isArray(studio.tags) ? studio.tags.join('、') : studio.tags }}</span>
                </div>
              </div>
            </td>
            <td>{{ ownerTeachersText(studio) }}</td>
            <td>{{ studio.city }}</td>
            <td>{{ studio.address }}</td>
            <td>{{ studio.contact || '—' }}</td>
            <td><span :class="['status-pill', statusClass(studio)]">{{ statusLabel(studio) }}</span></td>
            <td class="table-actions">
              <button v-if="studio.hasPending" class="table-action" @click="openApproval(studio)">审批</button>
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
            <input v-model="createDraft.city" placeholder="请输入城市，或通过地图选点自动填写" />
          </label>
          <label>
            地区
            <input v-model="createDraft.district" placeholder="请输入区/县，或通过地图选点自动填写" />
          </label>
          <label>
            详细地址
            <div class="address-row">
              <input v-model="createDraft.address" placeholder="可手动输入，或通过地图选点自动填写" />
              <button type="button" class="sync-btn map-pick-btn map-pick-btn--inline" @click="requestMapPicker(createDraft)">地图选点并自动填写地址</button>
            </div>
          </label>
          <label>
            联系方式
            <input v-model="createDraft.contact" placeholder="请输入联系方式" />
          </label>
          <label>
            联系方式图片（微信二维码）
            <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadContactImage($event, createDraft)" />
            <span class="field-hint">小程序详情页「联系工作室」抽屉中的「微信二维码」展示此图片，用户可扫码添加</span>
            <div v-if="createDraft.contactImage" class="asset-preview-list">
              <div class="asset-preview-item asset-preview-item--qr">
                <img class="asset-preview asset-preview--qr" :src="createDraft.contactImage" alt="微信二维码预览" />
                <button type="button" class="asset-preview-remove" @click="createDraft.contactImage = ''">×</button>
              </div>
            </div>
          </label>
          <label>
            标签
            <div class="tag-editor" :class="{ 'tag-editor--focus': createTagFocus }">
              <span v-for="(tag, idx) in createDraft.tags" :key="idx" class="tag-editor__chip">
                {{ tag }}
                <button type="button" class="tag-editor__remove" @click="removeCreateTag(idx)">×</button>
              </span>
              <input
                v-model="createTagInput"
                class="tag-editor__input"
                placeholder="输入后回车添加"
                @focus="createTagFocus = true"
                @blur="createTagFocus = false"
                @keydown.enter.prevent="addCreateTag"
                @keydown="handleCreateTagKey"
              />
            </div>
            <span class="field-hint" :class="{ 'field-hint--warn': createTagsCount > MAX_TAGS }">{{ createTagsCount }}/{{ MAX_TAGS }} 个标签，每个最多 6 字</span>
          </label>
        </div>
        <div class="field">
          <span class="field-label">主理教师（可多选）</span>
          <div ref="createMultiSelect" class="multi-select" @click.stop="openCreateTeacherDropdown">
            <div class="multi-select__trigger">
              <span v-if="createDraft.ownerTeacherIds.length" class="multi-select__chips">
                <span v-for="id in createDraft.ownerTeacherIds" :key="id" class="multi-select__chip">
                  {{ teacherName(id) }}
                  <button type="button" class="multi-select__chip-remove" @click.stop="removeCreateTeacher(id)">×</button>
                </span>
              </span>
              <span v-else class="multi-select__placeholder">请选择主理教师</span>
              <span class="multi-select__arrow">▾</span>
            </div>
            <div v-if="showCreateTeacherDropdown" class="multi-select__panel" @click.stop>
              <div class="multi-select__search">
                <input v-model="createTeacherSearch" placeholder="搜索姓名 / 喜乐名 / 证书编号" @click.stop />
              </div>
              <div v-for="t in filteredCreateTeacherOptions" :key="t.id" class="multi-select__option" @click.stop="toggleCreateTeacher(t.id)">
                <input type="checkbox" class="multi-select__input" :checked="hasTeacher(createDraft.ownerTeacherIds, t.id)" tabindex="-1" />
                <span class="multi-select__option-text">{{ t.name }}（{{ t.xileName || '无喜乐名' }}）</span>
              </div>
              <div v-if="!filteredCreateTeacherOptions.length" class="multi-select__empty">{{ teacherOptions.length ? '未找到匹配的教师' : '暂无教师可选' }}</div>
            </div>
          </div>
        </div>
        <div class="field">
          <span class="field-label">管理员（可添加/删除其他教师）</span>
          <div class="multi-select">
            <div class="multi-select__trigger">
              <span v-if="createDraft.managerTeacherIds.length" class="multi-select__chips">
                <span v-for="id in createDraft.managerTeacherIds" :key="id" class="multi-select__chip">
                  {{ teacherName(id) }}
                  <button type="button" class="multi-select__chip-remove" @click.stop="removeCreateManager(id)">×</button>
                </span>
              </span>
              <span v-else class="multi-select__placeholder">{{ createDraft.ownerTeacherIds.length ? '从主理教师中选择管理员' : '请先选择主理教师' }}</span>
            </div>
            <div v-if="createManagerOptions.length" class="multi-select__panel multi-select__panel--static">
              <div v-for="t in createManagerOptions" :key="t.id" class="multi-select__option" @click.stop="toggleCreateManager(t.id)">
                <input type="checkbox" class="multi-select__input" :checked="hasTeacher(createDraft.managerTeacherIds, t.id)" tabindex="-1" />
                <span class="multi-select__option-text">{{ t.name }}（{{ t.xileName || '无喜乐名' }}）</span>
              </div>
            </div>
          </div>
          <span class="field-hint">被选中的主理教师可在小程序端添加/删除其他主理教师</span>
        </div>
        <label>
          工作室介绍
          <textarea v-model="createDraft.courseIntro" placeholder="介绍工作室开设的课程（最多500字）"></textarea>
        </label>
        <label>
          工作室图片（最多 9 张，第一张为封面）
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="uploadStudioAssets($event, createDraft)" />
          <div v-if="createDraft.images.length" class="asset-preview-list">
            <div v-for="(img, idx) in createDraft.images" :key="idx" class="asset-preview-item">
              <img class="asset-preview" :src="img" alt="工作室图片预览" />
              <button type="button" class="asset-preview-remove" @click="removeImage(createDraft, idx)">×</button>
            </div>
          </div>
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
            <input v-model="editDraft.city" placeholder="请输入城市，或通过地图选点自动填写" />
          </label>
          <label>
            地区
            <input v-model="editDraft.district" placeholder="请输入区/县，或通过地图选点自动填写" />
          </label>
          <label>
            详细地址
            <div class="address-row">
              <input v-model="editDraft.address" placeholder="可手动输入，或通过地图选点自动填写" />
              <button type="button" class="sync-btn map-pick-btn map-pick-btn--inline" @click="requestMapPicker(editDraft)">重新地图选点</button>
            </div>
          </label>
          <label>
            联系方式
            <input v-model="editDraft.contact" placeholder="联系方式" />
          </label>
          <label>
            联系方式图片（微信二维码）
            <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadContactImage($event, editDraft)" />
            <span class="field-hint">小程序详情页「联系工作室」抽屉中的「微信二维码」展示此图片，用户可扫码添加</span>
            <div v-if="editDraft.contactImage" class="asset-preview-list">
              <div class="asset-preview-item asset-preview-item--qr">
                <img class="asset-preview asset-preview--qr" :src="editDraft.contactImage" alt="微信二维码预览" />
                <button type="button" class="asset-preview-remove" @click="editDraft.contactImage = ''">×</button>
              </div>
            </div>
          </label>
          <label>
            标签
            <div class="tag-editor" :class="{ 'tag-editor--focus': editTagFocus }">
              <span v-for="(tag, idx) in editDraft.tags" :key="idx" class="tag-editor__chip">
                {{ tag }}
                <button type="button" class="tag-editor__remove" @click="removeEditTag(idx)">×</button>
              </span>
              <input
                v-model="editTagInput"
                class="tag-editor__input"
                placeholder="输入后回车添加"
                @focus="editTagFocus = true"
                @blur="editTagFocus = false"
                @keydown.enter.prevent="addEditTag"
                @keydown="handleEditTagKey"
              />
            </div>
            <span class="field-hint" :class="{ 'field-hint--warn': editTagsCount > MAX_TAGS }">{{ editTagsCount }}/{{ MAX_TAGS }} 个标签，每个最多 6 字</span>
          </label>
        </div>
        <div class="field">
          <span class="field-label">主理教师（可多选）</span>
          <div ref="editMultiSelect" class="multi-select" @click.stop="openEditTeacherDropdown">
            <div class="multi-select__trigger">
              <span v-if="editDraft.ownerTeacherIds.length" class="multi-select__chips">
                <span v-for="id in editDraft.ownerTeacherIds" :key="id" class="multi-select__chip">
                  {{ teacherName(id) }}
                  <button type="button" class="multi-select__chip-remove" @click.stop="removeEditTeacher(id)">×</button>
                </span>
              </span>
              <span v-else class="multi-select__placeholder">请选择主理教师</span>
              <span class="multi-select__arrow">▾</span>
            </div>
            <div v-if="showEditTeacherDropdown" class="multi-select__panel" @click.stop>
              <div class="multi-select__search">
                <input v-model="editTeacherSearch" placeholder="搜索姓名 / 喜乐名 / 证书编号" @click.stop />
              </div>
              <div v-for="t in filteredEditTeacherOptions" :key="t.id" class="multi-select__option" @click.stop="toggleEditTeacher(t.id)">
                <input type="checkbox" class="multi-select__input" :checked="hasTeacher(editDraft.ownerTeacherIds, t.id)" tabindex="-1" />
                <span class="multi-select__option-text">{{ t.name }}（{{ t.xileName || '无喜乐名' }}）</span>
              </div>
              <div v-if="!filteredEditTeacherOptions.length" class="multi-select__empty">{{ teacherOptions.length ? '未找到匹配的教师' : '暂无教师可选' }}</div>
            </div>
          </div>
        </div>
        <div class="field">
          <span class="field-label">管理员（可添加/删除其他教师）</span>
          <div class="multi-select">
            <div class="multi-select__trigger">
              <span v-if="editDraft.managerTeacherIds.length" class="multi-select__chips">
                <span v-for="id in editDraft.managerTeacherIds" :key="id" class="multi-select__chip">
                  {{ teacherName(id) }}
                  <button type="button" class="multi-select__chip-remove" @click.stop="removeEditManager(id)">×</button>
                </span>
              </span>
              <span v-else class="multi-select__placeholder">{{ editDraft.ownerTeacherIds.length ? '从主理教师中选择管理员' : '请先选择主理教师' }}</span>
            </div>
            <div v-if="editManagerOptions.length" class="multi-select__panel multi-select__panel--static">
              <div v-for="t in editManagerOptions" :key="t.id" class="multi-select__option" @click.stop="toggleEditManager(t.id)">
                <input type="checkbox" class="multi-select__input" :checked="hasTeacher(editDraft.managerTeacherIds, t.id)" tabindex="-1" />
                <span class="multi-select__option-text">{{ t.name }}（{{ t.xileName || '无喜乐名' }}）</span>
              </div>
            </div>
          </div>
          <span class="field-hint">被选中的主理教师可在小程序端添加/删除其他主理教师</span>
        </div>
        <label>
          工作室介绍
          <textarea v-model="editDraft.courseIntro" placeholder="介绍工作室开设的课程（最多500字）"></textarea>
        </label>
        <label>
          工作室图片（最多 9 张，第一张为封面）
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="uploadStudioAssets($event, editDraft)" />
          <div v-if="editDraft.images.length" class="asset-preview-list">
            <div v-for="(img, idx) in editDraft.images" :key="idx" class="asset-preview-item">
              <img class="asset-preview" :src="img" alt="工作室图片预览" />
              <button type="button" class="asset-preview-remove" @click="removeImage(editDraft, idx)">×</button>
            </div>
          </div>
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

    <!-- Approval Modal -->
    <div v-if="showApproval" class="modal-backdrop" @click.self="closeApproval">
      <div class="admin-modal approval-modal">
        <div class="modal-head">
          <h2>审批工作室提交 — {{ approvalStudio && approvalStudio.name }}</h2>
          <button type="button" @click="closeApproval">×</button>
        </div>
        <div class="approval-diff">
          <div class="approval-diff__head">
            <span class="approval-diff__field-col">字段</span>
            <span class="approval-diff__cell-head">当前已公开</span>
            <span class="approval-diff__cell-head">待审批草稿</span>
          </div>
          <div class="approval-diff__row">
            <span class="approval-diff__field-col">地址</span>
            <div class="approval-diff__cell">{{ approvalStudio && approvalStudio.address || '—' }}</div>
            <div class="approval-diff__cell" :class="{ 'is-changed': pendingChanged('address', 'address') }">{{ approvalPending && approvalPending.address || '—' }}</div>
          </div>
          <div class="approval-diff__row">
            <span class="approval-diff__field-col">城市</span>
            <div class="approval-diff__cell">{{ approvalStudio && approvalStudio.city || '—' }}</div>
            <div class="approval-diff__cell" :class="{ 'is-changed': pendingChanged('city', 'city') }">{{ approvalPending && approvalPending.city || '—' }}</div>
          </div>
          <div class="approval-diff__row">
            <span class="approval-diff__field-col">地区</span>
            <div class="approval-diff__cell">{{ approvalStudio && approvalStudio.district || '—' }}</div>
            <div class="approval-diff__cell" :class="{ 'is-changed': pendingChanged('district', 'district') }">{{ approvalPending && approvalPending.district || '—' }}</div>
          </div>
          <div class="approval-diff__row">
            <span class="approval-diff__field-col">地图位置</span>
            <div class="approval-diff__cell">{{ coordText(approvalStudio) }}</div>
            <div class="approval-diff__cell" :class="{ 'is-changed': pendingChanged('coordinates', 'coordinates') }">{{ pendingCoordText(approvalPending) }}</div>
          </div>
          <div class="approval-diff__row">
            <span class="approval-diff__field-col">联系方式</span>
            <div class="approval-diff__cell">{{ approvalStudio && approvalStudio.contact || '—' }}</div>
            <div class="approval-diff__cell" :class="{ 'is-changed': pendingChanged('contact', 'contact') }">{{ approvalPending && approvalPending.contact || '—' }}</div>
          </div>
          <div class="approval-diff__row">
            <span class="approval-diff__field-col">标签</span>
            <div class="approval-diff__cell">{{ approvalStudio && approvalStudio.tags && approvalStudio.tags.join('、') || '—' }}</div>
            <div class="approval-diff__cell" :class="{ 'is-changed': pendingChanged('tags', 'tagsText') }">{{ approvalPending && approvalPending.tags && approvalPending.tags.join('、') || '—' }}</div>
          </div>
          <div class="approval-diff__row">
            <span class="approval-diff__field-col">工作室介绍</span>
            <div class="approval-diff__cell">{{ approvalStudio && approvalStudio.courseIntro || '—' }}</div>
            <div class="approval-diff__cell" :class="{ 'is-changed': pendingChanged('courseIntro', 'courseIntro') }">{{ approvalPending && approvalPending.courseIntro || '—' }}</div>
          </div>
          <div class="approval-diff__row">
            <span class="approval-diff__field-col">图片</span>
            <div class="approval-diff__cell">{{ approvalStudio && approvalStudio.images ? approvalStudio.images.length + ' 张' : '—' }}</div>
            <div class="approval-diff__cell" :class="{ 'is-changed': pendingChanged('images', 'imagesCount') }">{{ approvalPending && approvalPending.images ? approvalPending.images.length + ' 张' : '—' }}</div>
          </div>
          <div class="approval-diff__row">
            <span class="approval-diff__field-col">联系工作室图片</span>
            <div class="approval-diff__cell">
              <img v-if="approvalStudio && approvalStudio.contactImage" class="asset-preview asset-preview--qr" :src="approvalStudio.contactImage" alt="当前联系工作室图片" />
              <span v-else>—</span>
            </div>
            <div class="approval-diff__cell" :class="{ 'is-changed': pendingChanged('contactImage', 'contactImage') }">
              <img v-if="approvalPending && approvalPending.contactImage" class="asset-preview asset-preview--qr" :src="approvalPending.contactImage" alt="待审批联系工作室图片" />
              <span v-else>—</span>
            </div>
          </div>
        </div>
        <label class="reject-reason">
          <span class="field-label">驳回原因（驳回时必填）</span>
          <textarea v-model="rejectReason" placeholder="如通过则无需填写"></textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="closeApproval">取消</button>
          <button type="button" class="danger-btn" :disabled="approving" @click="handleReject">驳回</button>
          <button type="button" class="primary-btn" :disabled="approving" @click="handleApprove">{{ approving ? '处理中…' : '通过' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import ImagePreview from '../components/ImagePreview.vue'
import { fetchAdminStudios, fetchAdminTeachers, fetchMapConfig, searchMapPlaces, reverseGeocodeMapLocation, createStudio, updateStudio, deleteStudio, approveStudio, rejectStudio, uploadAdminAsset } from '../api/adminData'
import { useToast } from '../composables/useToast'
import Pagination from '../components/Pagination.vue'
import { normalizeMultiline } from '../utils/text.js'

const { show: toast } = useToast()
const filters = ref({ name: '', city: '', address: '', tags: '', status: '' })
const showCreate = ref(false)
const showEdit = ref(false)
const showApproval = ref(false)
const approvalStudio = ref(null)
const rejectReason = ref('')
const approving = ref(false)
const studios = ref([])
const teacherOptions = ref([])
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
  // 联系工作室图片：详情页点选后预览，内含电话、二维码等联系方式。
  contactImage: '',
  tags: [],
  address: '',
  courseIntro: '',
  images: [],
  ownerTeacherIds: [],
  managerTeacherIds: [],
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
  contactImage: '',
  tags: [],
  address: '',
  courseIntro: '',
  images: [],
  ownerTeacherIds: [],
  managerTeacherIds: [],
  coverUrl: '',
  latitude: '',
  longitude: '',
})

const MAX_TAGS = 8
const MAX_TAG_LENGTH = 6
const MAX_IMAGES = 9
const MAX_COURSE_INTRO_LENGTH = 500

const showCreateTeacherDropdown = ref(false)
const showEditTeacherDropdown = ref(false)
const createMultiSelect = ref(null)
const editMultiSelect = ref(null)
const createTeacherSearch = ref('')
const editTeacherSearch = ref('')

const createTagInput = ref('')
const editTagInput = ref('')
const createTagFocus = ref(false)
const editTagFocus = ref(false)

function teacherName(id) {
  const teacher = teacherOptions.value.find((t) => Number(t.id) === Number(id))
  return teacher ? teacher.name : `教师#${id}`
}

function hasTeacher(list, id) {
  return list.some((item) => Number(item) === Number(id))
}

function matchTeacher(t, query) {
  if (!query) return true
  const q = query.trim().toLowerCase()
  return [t.name, t.xileName, t.certNo, t.phone].some((field) => String(field || '').toLowerCase().includes(q))
}

const filteredCreateTeacherOptions = computed(() => teacherOptions.value.filter((t) => matchTeacher(t, createTeacherSearch.value)))
const filteredEditTeacherOptions = computed(() => teacherOptions.value.filter((t) => matchTeacher(t, editTeacherSearch.value)))

// 管理员候选：只能是已选的主理教师
const createManagerOptions = computed(() => teacherOptions.value.filter((t) => hasTeacher(createDraft.ownerTeacherIds, t.id)))
const editManagerOptions = computed(() => teacherOptions.value.filter((t) => hasTeacher(editDraft.ownerTeacherIds, t.id)))

function toggleCreateTeacher(id) {
  const ids = createDraft.ownerTeacherIds
  const numericId = Number(id)
  const index = ids.findIndex((item) => Number(item) === numericId)
  if (index === -1) ids.push(numericId)
  else ids.splice(index, 1)
}

function removeCreateTeacher(id) {
  const numericId = Number(id)
  const index = createDraft.ownerTeacherIds.findIndex((item) => Number(item) === numericId)
  if (index !== -1) createDraft.ownerTeacherIds.splice(index, 1)
}

function toggleEditTeacher(id) {
  const ids = editDraft.ownerTeacherIds
  const numericId = Number(id)
  const index = ids.findIndex((item) => Number(item) === numericId)
  if (index === -1) ids.push(numericId)
  else ids.splice(index, 1)
}

function removeEditTeacher(id) {
  const numericId = Number(id)
  const index = editDraft.ownerTeacherIds.findIndex((item) => Number(item) === numericId)
  if (index !== -1) editDraft.ownerTeacherIds.splice(index, 1)
}

function toggleCreateManager(id) {
  const ids = createDraft.managerTeacherIds
  const numericId = Number(id)
  const index = ids.findIndex((item) => Number(item) === numericId)
  if (index === -1) ids.push(numericId)
  else ids.splice(index, 1)
}

function removeCreateManager(id) {
  const numericId = Number(id)
  const index = createDraft.managerTeacherIds.findIndex((item) => Number(item) === numericId)
  if (index !== -1) createDraft.managerTeacherIds.splice(index, 1)
}

function toggleEditManager(id) {
  const ids = editDraft.managerTeacherIds
  const numericId = Number(id)
  const index = ids.findIndex((item) => Number(item) === numericId)
  if (index === -1) ids.push(numericId)
  else ids.splice(index, 1)
}

function removeEditManager(id) {
  const numericId = Number(id)
  const index = editDraft.managerTeacherIds.findIndex((item) => Number(item) === numericId)
  if (index !== -1) editDraft.managerTeacherIds.splice(index, 1)
}

function openCreateTeacherDropdown() {
  showCreateTeacherDropdown.value = true
  showEditTeacherDropdown.value = false
  createTeacherSearch.value = ''
}

function openEditTeacherDropdown() {
  showEditTeacherDropdown.value = true
  showCreateTeacherDropdown.value = false
  editTeacherSearch.value = ''
}

function closeTeacherDropdowns() {
  showCreateTeacherDropdown.value = false
  showEditTeacherDropdown.value = false
}

// 点击下拉框外部任意位置或按 Esc 时关闭选框
function handleDocumentClick(event) {
  const createEl = createMultiSelect.value
  const editEl = editMultiSelect.value
  const insideCreate = createEl && createEl.contains(event.target)
  const insideEdit = editEl && editEl.contains(event.target)
  if (!insideCreate && !insideEdit) {
    closeTeacherDropdowns()
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') closeTeacherDropdowns()
}

const createTagsCount = computed(() => createDraft.tags.length)
const editTagsCount = computed(() => editDraft.tags.length)

function addTagTo(tags, raw) {
  const tag = String(raw || '').trim().replace(/[,，]/g, '').trim()
  if (!tag) return ''
  if (tag.length > MAX_TAG_LENGTH) return `每个标签最多 ${MAX_TAG_LENGTH} 个字`
  if (tags.length >= MAX_TAGS) return `标签最多 ${MAX_TAGS} 个`
  if (tags.includes(tag)) return '标签已存在'
  tags.push(tag)
  return ''
}

function addCreateTag() {
  const err = addTagTo(createDraft.tags, createTagInput.value)
  if (err) { toast(err, 'error'); return }
  createTagInput.value = ''
}

function addEditTag() {
  const err = addTagTo(editDraft.tags, editTagInput.value)
  if (err) { toast(err, 'error'); return }
  editTagInput.value = ''
}

// 中文输入法回车确认（keyCode 229）不应触发添加，仅在英文逗号/回车时提交
function handleCreateTagKey(e) {
  if (e.key === ',' || e.key === '，') {
    e.preventDefault()
    addCreateTag()
  }
}

function handleEditTagKey(e) {
  if (e.key === ',' || e.key === '，') {
    e.preventDefault()
    addEditTag()
  }
}

function removeCreateTag(idx) {
  createDraft.tags.splice(idx, 1)
}

function removeEditTag(idx) {
  editDraft.tags.splice(idx, 1)
}

function validateTags(tags) {
  if (tags.length > MAX_TAGS) return `标签最多 ${MAX_TAGS} 个`
  if (tags.some((t) => t.length > MAX_TAG_LENGTH)) return `每个标签最多 ${MAX_TAG_LENGTH} 个字`
  return ''
}

async function loadStudios() {
  try {
    studios.value = await fetchAdminStudios()
  } catch (e) {
    console.warn('获取工作室列表失败', e)
    toast('工作室列表加载失败，请稍后重试', 'error')
  }
}

async function loadTeachers() {
  try {
    teacherOptions.value = await fetchAdminTeachers()
  } catch (e) {
    console.warn('获取教师列表失败', e)
    toast('教师列表加载失败，主理教师可能无法选择', 'error')
  }
}

const refreshing = ref(false)

async function refresh() {
  refreshing.value = true
  try {
    await Promise.all([loadStudios(), loadTeachers()])
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  loadStudios()
  loadTeachers()
  loadMapKey()
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
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
  const status = filters.value.status
  return studios.value.filter((s) => {
    if (status && s.status !== status) return false
    const tagsText = Array.isArray(s.tags) ? s.tags.join(' ') : s.tags
    return matches(s.name, name) && matches(s.city, city) && matches(s.address, address) && matches(tagsText, tags)
  })
})

const hasFilters = computed(() => Object.values(filters.value).some((value) => value && value.trim()))

function ownerTeachersText(studio) {
  const teachers = Array.isArray(studio.ownerTeachers) ? studio.ownerTeachers : []
  if (teachers.length) return teachers.map((t) => t.name).join('、')
  return studio.ownerTeacherName || '—'
}

function statusLabel(studio) {
  if (studio.status === 'hidden') return '已隐藏'
  if (studio.status === 'pending') return '待审批'
  if (studio.status === 'incomplete') return '未提交'
  return '正常'
}

function statusClass(studio) {
  if (studio.status === 'hidden') return 'hidden'
  if (studio.status === 'pending') return 'pending'
  if (studio.status === 'incomplete') return 'incomplete'
  return ''
}

const totalPages = computed(() => Math.ceil(filteredList.value.length / pageSize))
const pagedList = computed(() => filteredList.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
watch(filters, () => { currentPage.value = 1 }, { deep: true })
watch(totalPages, (total) => {
  if (total > 0 && currentPage.value > total) currentPage.value = total
})

// 主理教师变化时，自动剔除不再属于主理教师的管理员
watch(() => createDraft.ownerTeacherIds, (ids) => {
  createDraft.managerTeacherIds = createDraft.managerTeacherIds.filter((m) => ids.some((i) => Number(i) === Number(m)))
}, { deep: true })
watch(() => editDraft.ownerTeacherIds, (ids) => {
  editDraft.managerTeacherIds = editDraft.managerTeacherIds.filter((m) => ids.some((i) => Number(i) === Number(m)))
}, { deep: true })

function openCreate() {
  createDraft.name = ''
  createDraft.city = ''
  createDraft.district = ''
  createDraft.contact = ''
  createDraft.contactImage = ''
  createDraft.tags = []
  createDraft.address = ''
  createDraft.courseIntro = ''
  createDraft.images = []
  createDraft.ownerTeacherIds = []
  createDraft.managerTeacherIds = []
  createDraft.coverUrl = ''
  createDraft.latitude = ''
  createDraft.longitude = ''
  createTagInput.value = ''
  showCreateTeacherDropdown.value = false
  showCreate.value = true
}

function openEdit(studio) {
  editDraft.id = studio.id
  editDraft.name = studio.name
  editDraft.city = studio.city || ''
  editDraft.district = studio.district || ''
  editDraft.contact = studio.contact || ''
  editDraft.contactImage = studio.contactImage || ''
  editDraft.tags = Array.isArray(studio.tags) ? studio.tags.slice() : String(studio.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
  editDraft.address = studio.address || ''
  editDraft.courseIntro = studio.courseIntro || ''
  editDraft.images = Array.isArray(studio.images) ? studio.images.slice() : []
  editDraft.ownerTeacherIds = Array.isArray(studio.ownerTeachers) ? studio.ownerTeachers.map((t) => Number(t.id)) : []
  editDraft.managerTeacherIds = Array.isArray(studio.managerTeachers) ? studio.managerTeachers.map((id) => Number(id)) : []
  editDraft.coverUrl = studio.coverUrl || ''
  editDraft.latitude = studio.latitude ?? ''
  editDraft.longitude = studio.longitude ?? ''
  editTagInput.value = ''
  showEditTeacherDropdown.value = false
  showEdit.value = true
}

async function handleCreate() {
  if (!createDraft.address.trim()) {
    toast('请填写工作室地址', 'error')
    return
  }
  const tagsError = validateTags(createDraft.tags)
  if (tagsError) {
    toast(tagsError, 'error')
    return
  }
  // 先规范化换行再校验长度：连续空行会被压缩，避免「看着没超但存进去超了」
  const courseIntro = normalizeMultiline(createDraft.courseIntro)
  if (courseIntro.length > MAX_COURSE_INTRO_LENGTH) {
    toast(`课程介绍最多 ${MAX_COURSE_INTRO_LENGTH} 字`, 'error')
    return
  }
  await createStudio({
    name: createDraft.name,
    city: createDraft.city,
    district: createDraft.district,
    contact: createDraft.contact,
    contactImage: createDraft.contactImage,
    tags: createDraft.tags.join(','),
    address: createDraft.address,
    courseIntro,
    images: createDraft.images,
    ownerTeacherIds: createDraft.ownerTeacherIds,
    managerTeacherIds: createDraft.managerTeacherIds,
    coverUrl: createDraft.images[0] || '',
    latitude: createDraft.latitude === '' ? null : Number(createDraft.latitude),
    longitude: createDraft.longitude === '' ? null : Number(createDraft.longitude),
  })
  showCreate.value = false
  toast('工作室添加成功')
  await loadStudios()
}

async function handleUpdate() {
  if (!editDraft.address.trim()) {
    toast('请填写工作室地址', 'error')
    return
  }
  const tagsError = validateTags(editDraft.tags)
  if (tagsError) {
    toast(tagsError, 'error')
    return
  }
  const courseIntro = normalizeMultiline(editDraft.courseIntro)
  if (courseIntro.length > MAX_COURSE_INTRO_LENGTH) {
    toast(`课程介绍最多 ${MAX_COURSE_INTRO_LENGTH} 字`, 'error')
    return
  }
  await updateStudio(editDraft.id, {
    name: editDraft.name,
    city: editDraft.city,
    district: editDraft.district,
    contact: editDraft.contact,
    contactImage: editDraft.contactImage,
    tags: editDraft.tags.join(','),
    address: editDraft.address,
    courseIntro,
    images: editDraft.images,
    ownerTeacherIds: editDraft.ownerTeacherIds,
    managerTeacherIds: editDraft.managerTeacherIds,
    coverUrl: editDraft.images[0] || '',
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

const approvalPending = computed(() => (approvalStudio.value && approvalStudio.value.pending) || null)

function coordText(item) {
  if (!item) return '—'
  const lat = Number(item.latitude)
  const lng = Number(item.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '未设置'
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

function pendingCoordText(pending) {
  if (!pending) return '—'
  return coordText({ latitude: pending.latitude, longitude: pending.longitude })
}

function pendingChanged(draftKey, currentKey) {
  const studio = approvalStudio.value
  const pending = approvalPending.value
  if (!studio || !pending) return false
  if (draftKey === 'images') return pending.images.length !== (studio.images ? studio.images.length : 0)
  if (draftKey === 'coordinates') {
    return Number(pending.latitude || 0) !== Number(studio.latitude || 0) || Number(pending.longitude || 0) !== Number(studio.longitude || 0)
  }
  if (currentKey === 'tagsText') return (pending.tags || []).join('、') !== (studio.tags || []).join('、')
  return (pending[draftKey] || '') !== (studio[currentKey] || '')
}

function openApproval(studio) {
  approvalStudio.value = studio
  rejectReason.value = ''
  showApproval.value = true
}

function closeApproval() {
  showApproval.value = false
  approvalStudio.value = null
  rejectReason.value = ''
  approving.value = false
}

async function handleApprove() {
  const studio = approvalStudio.value
  if (!studio) return
  approving.value = true
  try {
    await approveStudio(studio.id)
    toast('已通过并公开展示')
    closeApproval()
    await loadStudios()
  } catch (e) {
    toast(e?.response?.data?.error || '审批失败，请稍后重试', 'error')
  } finally {
    approving.value = false
  }
}

async function handleReject() {
  const studio = approvalStudio.value
  if (!studio) return
  if (!rejectReason.value.trim()) {
    toast('请填写驳回原因', 'error')
    return
  }
  approving.value = true
  try {
    await rejectStudio(studio.id, rejectReason.value.trim())
    toast('已驳回')
    closeApproval()
    await loadStudios()
  } catch (e) {
    toast(e?.response?.data?.error || '驳回失败，请稍后重试', 'error')
  } finally {
    approving.value = false
  }
}

async function uploadStudioAssets(event, draft) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  const remaining = MAX_IMAGES - draft.images.length
  if (remaining <= 0) {
    toast(`图片最多 ${MAX_IMAGES} 张`, 'error')
    event.target.value = ''
    return
  }
  const toUpload = files.slice(0, remaining)
  const allowed = ['.jpg', '.jpeg', '.png', '.webp']
  for (const file of toUpload) {
    const ext = (file.name || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || ''
    if (!allowed.includes(ext)) {
      toast(`「${file.name || '所选文件'}」格式不支持，仅支持 JPG、PNG 和 WebP 图片`, 'error')
      event.target.value = ''
      return
    }
  }
  try {
    for (const file of toUpload) {
      const result = await uploadAdminAsset(file, 'studio-cover')
      draft.images.push(result.url)
    }
    draft.coverUrl = draft.images[0] || ''
    toast('图片已上传到对象存储')
  } catch (e) {
    const message = e?.response?.data?.error || e?.message || '图片上传失败，请检查对象存储配置'
    toast(message === 'image too large, max 8MB' ? '图片大小不能超过 8MB' : message, 'error')
  } finally {
    event.target.value = ''
  }
}

function removeImage(draft, index) {
  draft.images.splice(index, 1)
  draft.coverUrl = draft.images[0] || ''
}

// 联系工作室图片：单张，使用 studio-contact 资源类型上传（公开可读、稳定 URL）。
async function uploadContactImage(event, draft) {
  const file = (event.target.files || [])[0]
  if (!file) return
  const ext = (file.name || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || ''
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    toast('仅支持 JPG、PNG 和 WebP 图片', 'error')
    event.target.value = ''
    return
  }
  try {
    const result = await uploadAdminAsset(file, 'studio-contact')
    draft.contactImage = result.url
    toast('联系工作室图片已上传')
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

/* 微信二维码预览：正方形 + contain，避免裁切二维码导致无法识别 */
.asset-preview--qr {
  width: 80px;
  height: 80px;
  object-fit: contain;
  background: #fff;
}

.asset-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.asset-preview-item {
  position: relative;
}

.asset-preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  line-height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.admin-modal textarea {
  width: 100%;
  min-height: 64px;
  padding: 8px 10px;
  border: 1px solid #d7ddd7;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.admin-modal select[multiple] {
  width: 100%;
  min-height: 88px;
  padding: 6px;
  border: 1px solid #d7ddd7;
  border-radius: 8px;
  font-size: 14px;
}

.field-hint {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: #8a948d;
}

.field-hint--warn {
  color: #c84b45;
}

.field {
  display: grid;
  gap: 7px;
  margin-bottom: 14px;
  color: #65706a;
  font-size: 12px;
  font-weight: 800;
}

/* 详细地址输入框 + 地图选点按钮并排 */
.address-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.address-row input {
  flex: 1;
  min-width: 0;
}

.map-pick-btn--inline {
  flex-shrink: 0;
  margin: 0;
  height: 40px;
  white-space: nowrap;
}

.multi-select {
  position: relative;
}

.multi-select__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid #d7ddd7;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.multi-select__placeholder {
  color: #8a948d;
  font-size: 14px;
}

.multi-select__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.multi-select__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #edf5ef;
  color: #2f5140;
  font-size: 13px;
}

.multi-select__chip-remove {
  border: none;
  background: transparent;
  color: #2f5140;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.multi-select__arrow {
  margin-left: auto;
  color: #8a948d;
  font-size: 12px;
}

.multi-select__panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #d7ddd7;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

/* 管理员多选：候选直接平铺展示，不做下拉浮层 */
.multi-select__panel--static {
  position: static;
  margin-top: 8px;
  max-height: 180px;
  box-shadow: none;
}

.multi-select__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 14px;
  user-select: none;
}

.multi-select__option:hover {
  background: #f5f8f5;
}

.multi-select__search {
  position: sticky;
  top: 0;
  padding: 8px;
  border-bottom: 1px solid #eef2ee;
  background: #fff;
}

.multi-select__search input {
  box-sizing: border-box;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #d7ddd7;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}

.multi-select__search input:focus {
  border-color: #426d58;
  box-shadow: 0 0 0 3px rgba(66, 109, 88, .12);
}

.multi-select__input {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  pointer-events: none;
}

.multi-select__option-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.multi-select__empty {
  padding: 12px;
  text-align: center;
  color: #8a948d;
  font-size: 13px;
}

.tag-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 5px 8px;
  border: 1px solid #d7ddd7;
  border-radius: 8px;
  background: #fff;
  transition: border-color .15s ease, box-shadow .15s ease;
}

.tag-editor--focus {
  border-color: #426d58;
  box-shadow: 0 0 0 3px rgba(66, 109, 88, .12);
}

.tag-editor__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  background: #edf5ef;
  color: #2f5140;
  font-size: 13px;
}

.tag-editor__remove {
  border: none;
  background: transparent;
  color: #2f5140;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.tag-editor__input {
  flex: 1;
  min-width: 100px;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 4px 2px;
  background: transparent;
}

.status-pill.pending {
  background: #f7efd6;
  color: #9c7a1a;
}

.status-pill.incomplete {
  background: #f0f2f0;
  color: #8a948d;
}

.studio-cell__tags {
  display: block;
  color: #8a948d;
  font-size: 12px;
  margin-top: 2px;
}

.approval-diff {
  margin-bottom: 16px;
  border: 1px solid #e3e9e3;
  border-radius: 8px;
  overflow: hidden;
}

.approval-modal {
  width: min(960px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}

.approval-diff__head,
.approval-diff__row {
  display: grid;
  grid-template-columns: 96px 1fr 1fr;
  align-items: stretch;
}

.approval-diff__head {
  background: #f0f5f1;
  border-bottom: 1px solid #e3e9e3;
}

.approval-diff__field-col,
.approval-diff__cell-head,
.approval-diff__cell {
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
}

.approval-diff__field-col {
  color: #8a948d;
  font-weight: 600;
  border-right: 1px solid #e3e9e3;
  background: #fafcfa;
  display: flex;
  align-items: center;
}

.approval-diff__cell-head {
  color: #2f5140;
  font-weight: 600;
  text-align: left;
}

.approval-diff__cell-head + .approval-diff__cell-head {
  border-left: 1px solid #e3e9e3;
}

.approval-diff__row {
  border-bottom: 1px solid #eef2ee;
}

.approval-diff__row:last-child {
  border-bottom: none;
}

.approval-diff__cell {
  color: #1f2521;
  /* 保留换行与连续空格，课程介绍等长文本才能按段落渲染出空行间距 */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #fff;
}

.approval-diff__cell + .approval-diff__cell {
  border-left: 1px solid #eef2ee;
}

.approval-diff__cell.is-changed {
  color: #9c7a1a;
  font-weight: 600;
  background: #fdf8e8;
}

.reject-reason {
  display: block;
  margin-bottom: 16px;
}

.reject-reason textarea {
  width: 100%;
  min-height: 64px;
  padding: 8px 10px;
  border: 1px solid #d7ddd7;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}
</style>
