<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Dialog as TDialog, Button as TButton, Loading as TLoading, Tabs as TTabs, TabPanel as TTabPanel, Select as TSelect, Option as TOption, MessagePlugin, Input as TInput } from 'tdesign-vue-next'
import type { TabValue } from 'tdesign-vue-next'
import { downloadWallpaper } from '@/utils/download'
import { getImageResolution } from '@/utils/image'
import { getImages, updateImageCategory } from '@/api/index'

interface Wallpaper {
  id: string
  fileName: string
  originalUrl: string
  thumbnailUrl: string
  uploadTime: string
  fileSize: number
  category?: string
  resolution?: {
    width: number
    height: number
  }
}

// 分类列表
const categories = [
  { value: 'all', label: '全部' },
  { value: 'nature', label: '自然' },
  { value: 'beauty', label: '美女' },
  { value: 'anime', label: '动漫' }
]

const wallpapers = ref<Wallpaper[]>([])
const dialogVisible = ref(false)
const currentWallpaper = ref<Wallpaper | null>(null)
const loading = ref(false)
const isLoading = ref(false)
const activeCategory = ref('all')

// 搜索相关
const searchKeyword = ref('')
const searchTimeout = ref<number | null>(null)

// 分类设置相关
const categoryDialogVisible = ref(false)
const selectedCategory = ref('')
const categoryLoading = ref(false)

// 按分类和搜索关键词筛选壁纸
const filteredWallpapers = computed(() => {
  // 先按分类筛选
  let filtered = activeCategory.value === 'all'
    ? wallpapers.value
    : wallpapers.value.filter(wallpaper => wallpaper.category === activeCategory.value)

  // 再按搜索关键词筛选
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(wallpaper =>
      wallpaper.fileName.toLowerCase().includes(keyword)
    )
  }

  return filtered
})

// 从API获取壁纸数据
const fetchWallpapers = async (search = '') => {
  try {
    isLoading.value = true
    const data = await getImages(search)
    wallpapers.value = data
    loadResolutions()
  } catch (error) {
    console.error('获取壁纸列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 处理搜索输入
const handleSearch = (value: string) => {
  searchKeyword.value = value

  // 防抖处理，避免频繁请求
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  searchTimeout.value = window.setTimeout(() => {
    fetchWallpapers(value)
  }, 500) // 500ms 延迟
}

// 切换分类
const handleCategoryChange = (value: TabValue) => {
  activeCategory.value = value as string
}

// 获取所有壁纸的分辨率
const loadResolutions = async () => {
  for (const wallpaper of wallpapers.value) {
    try {
      const resolution = await getImageResolution(wallpaper.originalUrl)
      wallpaper.resolution = resolution
    } catch (error) {
      console.error(`获取壁纸 ${wallpaper.id} 分辨率失败:`, error)
    }
  }
}

// 组件挂载后获取壁纸数据
onMounted(() => {
  fetchWallpapers()
})

const onOpenModal = (wallpaper: Wallpaper) => {
  currentWallpaper.value = wallpaper
  dialogVisible.value = true
}

const onCloseDialog = () => {
  dialogVisible.value = false
}

const handleDownload = async () => {
  if (!currentWallpaper.value) return

  try {
    loading.value = true

    const imageUrl = `http://localhost:3000${currentWallpaper.value.originalUrl}`
    const imageName = currentWallpaper.value.fileName || `wallpaper-${currentWallpaper.value.id}`

    await downloadWallpaper(imageUrl, imageName)
  } catch (error) {
    console.error('下载失败', error)
  } finally {
    loading.value = false
  }
}

// 打开分类设置对话框
const openCategoryDialog = () => {
  if (!currentWallpaper.value) return

  // 设置当前选中的分类
  selectedCategory.value = currentWallpaper.value.category || ''
  categoryDialogVisible.value = true
}

// 保存分类设置
const saveCategory = async () => {
  if (!currentWallpaper.value) return

  try {
    categoryLoading.value = true

    // 调用API更新分类
    await updateImageCategory(currentWallpaper.value.id, selectedCategory.value)

    // 更新本地数据
    if (currentWallpaper.value) {
      currentWallpaper.value.category = selectedCategory.value

      // 更新壁纸列表中的对应项
      const index = wallpapers.value.findIndex(w => w.id === currentWallpaper.value?.id)
      if (index !== -1) {
        wallpapers.value[index].category = selectedCategory.value
      }
    }

    // 关闭对话框
    categoryDialogVisible.value = false
    MessagePlugin.success('分类设置成功')
  } catch (error) {
    console.error('设置分类失败', error)
    MessagePlugin.error('设置分类失败')
  } finally {
    categoryLoading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">壁纸库</h1>

    <div>
      <div class="header-container">
        <t-tabs
          v-model="activeCategory"
          @change="handleCategoryChange"
        >
          <t-tab-panel
            v-for="item in categories"
            :key="item.value"
            :value="item.value"
            :label="item.label"
          />
        </t-tabs>

        <div class="search-container">
          <t-input
            v-model="searchKeyword"
            placeholder="搜索文件名..."
            clearable
            @change="handleSearch"
          >
            <template #suffix-icon>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                ></circle>
                <line
                  x1="21"
                  y1="21"
                  x2="16.65"
                  y2="16.65"
                ></line>
              </svg>
            </template>
          </t-input>
        </div>
      </div>

      <div
        v-if="isLoading"
        class="loading-container"
      >
        <t-loading />
      </div>

      <div
        v-else-if="wallpapers.length === 0"
        class="empty-state"
      >
        没有找到壁纸，请上传一些壁纸
      </div>

      <div v-else>
        <div class="wallpapers-grid">
          <div
            class="wallpaper-card"
            v-for="wallpaper in filteredWallpapers"
            :key="wallpaper.id"
            @click="onOpenModal(wallpaper)"
          >
            <img
              :src="wallpaper.thumbnailUrl"
              :alt="wallpaper.fileName"
            />
            <div class="wallpaper-info">
              <span class="wallpaper-name">{{ wallpaper.fileName }}</span>
              <span
                class="wallpaper-resolution"
                v-if="wallpaper.resolution"
              >
                {{ wallpaper.resolution.width }} × {{ wallpaper.resolution.height }}
              </span>
            </div>
            <div
              class="wallpaper-category"
              :class="wallpaper.category"
            >
              {{categories.find(cat => cat.value === wallpaper.category)?.label}}
            </div>
          </div>
        </div>
      </div>

      <t-dialog
        :visible="dialogVisible"
        :header="currentWallpaper?.fileName"
        attach="body"
        @close="onCloseDialog"
        class="wallpaper-dialog"
        width="auto"
        top="5%"
      >
        <div
          v-if="currentWallpaper"
          class="dialog-content"
        >
          <img
            :src="currentWallpaper.originalUrl"
            :alt="currentWallpaper.fileName"
            class="dialog-image"
          />
          <div class="dialog-image-info">
            <p>上传时间: {{ currentWallpaper.uploadTime }}</p>
            <p>文件大小: {{ Math.round(currentWallpaper.fileSize / 1024) }} KB</p>
            <p v-if="currentWallpaper.category">
              分类: {{categories.find(cat => cat.value === currentWallpaper?.category)?.label}}
            </p>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <t-button
              theme="default"
              @click="openCategoryDialog"
            >设置分类</t-button>
            <t-button
              theme="default"
              @click="onCloseDialog"
            >关闭</t-button>
            <t-button
              theme="primary"
              :loading="loading"
              @click="handleDownload"
            >下载</t-button>
          </div>
        </template>
      </t-dialog>

      <!-- 分类设置对话框 -->
      <t-dialog
        :visible="categoryDialogVisible"
        header="设置壁纸分类"
        attach="body"
        @close="categoryDialogVisible = false"
        class="category-dialog"
        width="500px"
      >
        <div class="category-form">
          <t-select
            v-model="selectedCategory"
            placeholder="请选择分类"
            clearable
          >
            <t-option
              v-for="item in categories.filter(c => c.value !== 'all')"
              :key="item.value"
              :value="item.value"
              :label="item.label"
            />
          </t-select>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <t-button
              theme="default"
              @click="categoryDialogVisible = false"
            >取消</t-button>
            <t-button
              theme="primary"
              :loading="categoryLoading"
              @click="saveCategory"
            >保存</t-button>
          </div>
        </template>
      </t-dialog>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-container {
  width: 300px;
}

.wallpapers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.wallpaper-card {
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--box-shadow);
  cursor: pointer;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  aspect-ratio: 16/9;
  position: relative;
}

.wallpaper-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--box-shadow-hover);
}

.wallpaper-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wallpaper-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 5px 8px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
}

.wallpaper-category {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
  font-weight: 500;
}

.wallpaper-category.nature {
  background-color: rgba(0, 128, 0, 0.7);
}

.wallpaper-category.beauty {
  background-color: rgba(255, 105, 180, 0.7);
}

.wallpaper-category.anime {
  background-color: rgba(65, 105, 225, 0.7);
}

.wallpaper-resolution {
  font-family: 'Courier New', monospace;
}

.wallpaper-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 90vw;
  max-width: 1200px;
}

.dialog-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: var(--border-radius);
}

.dialog-image-info {
  margin-top: var(--spacing-sm);
  font-size: 14px;
  color: var(--text-secondary);
  width: 100%;
}

.dialog-image-info p {
  margin: 5px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  margin-top: 20px;
}

.empty-state {
  text-align: center;
  margin-top: 50px;
  color: var(--text-secondary);
}

.wallpaper-dialog :deep(.t-dialog__body) {
  padding: 16px;
}

.wallpaper-dialog :deep(.t-dialog__header) {
  padding: 16px 24px;
}

.category-form {
  padding: 16px 0;
}

.category-dialog :deep(.t-dialog__body) {
  padding: 16px 24px;
}

.category-dialog :deep(.t-dialog__header) {
  padding: 16px 24px;
}
</style>
