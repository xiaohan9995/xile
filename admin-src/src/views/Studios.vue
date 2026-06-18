<template>
  <div>
    <div class="page-head">
      <div>
        <h1>工作室入驻（馆舍推荐）</h1>
        <p>管理展陈合作的高空雅室会馆，支持添加新店面和删除下线。</p>
      </div>
      <button class="primary-btn" @click="showCreate = true">＋ 添加合伙工作室</button>
    </div>

    <div class="admin-searchline">
      <span>⌕</span>
      <input v-model="keyword" placeholder="搜索工作室名称、城市或地址..." />
    </div>

    <div class="data-table-wrap roster-wrap">
      <table class="data-table roster-table">
        <thead>
          <tr>
            <th>馆舍面貌 & 名称</th>
            <th>合伙城市</th>
            <th>精确地址</th>
            <th>预约专线</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="studio in filteredStudios" :key="studio.name">
            <td>
              <div class="cell-person compact studio-cell">
                <img :src="studio.image" :alt="studio.name" />
                <div>
                  <strong>{{ studio.name }}</strong>
                  <span>{{ studio.tags }}</span>
                </div>
              </div>
            </td>
            <td>{{ studio.city }}</td>
            <td class="address-cell">{{ studio.address }}</td>
            <td>{{ studio.contact }}</td>
            <td><button class="icon-danger" aria-label="删除工作室" @click="removeStudio(studio.name)">⌧</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <form class="admin-modal wide" @submit.prevent="createStudio">
        <div class="modal-head">
          <h2>添加合伙工作室</h2>
          <button type="button" @click="showCreate = false">×</button>
        </div>
        <div class="form-grid two">
          <label>
            工作室名称
            <input v-model="draft.name" required placeholder="例如：晨光瑜伽空间" />
          </label>
          <label>
            合伙城市
            <input v-model="draft.city" required placeholder="上海市" />
          </label>
          <label>
            预约专线
            <input v-model="draft.contact" required placeholder="021-00000000" />
          </label>
          <label>
            标签
            <input v-model="draft.tags" required placeholder="静心冥想 · 小班授课" />
          </label>
        </div>
        <label>
          精确地址
          <input v-model="draft.address" required placeholder="城市、区县、楼栋、门牌" />
        </label>
        <div class="modal-actions">
          <button type="button" class="sync-btn" @click="showCreate = false">取消</button>
          <button class="primary-btn">确认添加</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchAdminStudios } from '../api/adminData.js'

const route = useRoute()
const keyword = ref('')
const showCreate = ref(route.query.create === '1')
const draft = reactive({
  name: '',
  tags: '静心冥想 · 小班授课',
  city: '上海市',
  address: '',
  contact: '',
})

const studioRows = ref([
  {
    name: '静心瑜伽空间',
    tags: '静心冥想 · 小班授课',
    city: '上海市',
    address: '上海市徐汇区复兴中路1199号A栋302室',
    contact: '021-64332211',
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop',
  },
  {
    name: '清悦身心练习室',
    tags: '露台瑜伽 · 空中瑜伽',
    city: '北京市',
    address: '北京市朝阳区建国路88号SOHO现代城5号楼',
    contact: '010-85889900',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop',
  },
  {
    name: '自在瑜伽小院',
    tags: '中式庭院 · 茶道瑜伽',
    city: '杭州市',
    address: '杭州市西湖区满觉陇路下满觉陇88号',
    contact: '0571-88997766',
    image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=80&w=600&auto=format&fit=crop',
  },
  {
    name: '梵雅流瑜伽坊',
    tags: '阿斯汤加 · 高温热瑜伽',
    city: '广州市',
    address: '广州市天河区珠江新城花城大道66号',
    contact: '020-38002233',
    image: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?q=80&w=600&auto=format&fit=crop',
  },
  {
    name: '悦心空灵阁',
    tags: '音疗冥想 · 孕妇理疗',
    city: '深圳市',
    address: '深圳市南山区后海滨路云际大厦18楼',
    contact: '0755-86663322',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600&auto=format&fit=crop',
  },
])

onMounted(async () => {
  try {
    studioRows.value = await fetchAdminStudios()
  } catch (error) {
    console.warn('工作室接口暂不可用，保留本地演示数据', error)
  }
})

const filteredStudios = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return studioRows.value
  return studioRows.value.filter((studio) => [studio.name, studio.city, studio.address, studio.tags].some((field) => field.toLowerCase().includes(text)))
})

function createStudio() {
  studioRows.value.unshift({
    name: draft.name,
    tags: draft.tags,
    city: draft.city,
    address: draft.address,
    contact: draft.contact,
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=600&auto=format&fit=crop',
  })
  draft.name = ''
  draft.tags = '静心冥想 · 小班授课'
  draft.city = '上海市'
  draft.address = ''
  draft.contact = ''
  showCreate.value = false
}

function removeStudio(name) {
  if (!window.confirm('确认下线该合作工作室？')) return
  studioRows.value = studioRows.value.filter((studio) => studio.name !== name)
}
</script>
