<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  Dialog as TDialog,
  Button as TButton,
  Loading as TLoading,
  Select as TSelect,
  Option as TOption,
  MessagePlugin,
} from 'tdesign-vue-next'
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
  category?: string | null
  resolution?: {
    width: number
    height: number
  }
}

const categories = [
  { value: 'all', label: '全部' },
  { value: 'nature', label: '自然' },
  { value: 'beauty', label: '美女' },
  { value: 'anime', label: '动漫' },
]

const wallpapers = ref<Wallpaper[]>([])
const dialogVisible = ref(false)
const currentWallpaper = ref<Wallpaper | null>(null)
const loading = ref(false)
const isLoading = ref(false)
const activeCategory = ref('all')

const searchKeyword = ref('')
const searchTimeout = ref<number | null>(null)

const categoryDialogVisible = ref(false)
const selectedCategory = ref('')
const categoryLoading = ref(false)

const filteredWallpapers = computed(() => {
  let filtered =
    activeCategory.value === 'all'
      ? wallpapers.value
      : wallpapers.value.filter((wallpaper) => wallpaper.category === activeCategory.value)

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter((wallpaper) => wallpaper.fileName.toLowerCase().includes(keyword))
  }

  return filtered
})

const getCategoryLabel = (category?: string | null) => {
  if (!category) {
    return '未分类'
  }
  return categories.find((item) => item.value === category)?.label || '未分类'
}

const formatUploadTime = (uploadTime: string) => {
  const date = new Date(uploadTime)
  return Number.isNaN(date.getTime()) ? uploadTime : date.toLocaleString()
}

const fetchWallpapers = async (search = '') => {
  try {
    isLoading.value = true
    const data = await getImages(search)
    wallpapers.value = data
    await loadResolutions()
  } catch (error) {
    console.error('获取壁纸列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

const handleSearch = (value: string) => {
  searchKeyword.value = value

  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  searchTimeout.value = window.setTimeout(() => {
    fetchWallpapers(value)
  }, 450)
}

const handleCategoryChange = (value: string) => {
  activeCategory.value = value
}

const loadResolutions = async () => {
  await Promise.all(
    wallpapers.value.map(async (wallpaper) => {
      try {
        const resolution = await getImageResolution(wallpaper.originalUrl)
        wallpaper.resolution = resolution
      } catch (error) {
        console.error(`获取壁纸 ${wallpaper.id} 分辨率失败:`, error)
      }
    }),
  )
}

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
  if (!currentWallpaper.value) {
    return
  }

  try {
    loading.value = true
    const imageUrl = currentWallpaper.value.originalUrl
    const imageName = currentWallpaper.value.fileName || `wallpaper-${currentWallpaper.value.id}`

    await downloadWallpaper(imageUrl, imageName)
  } catch (error) {
    console.error('下载失败', error)
  } finally {
    loading.value = false
  }
}

const openCategoryDialog = () => {
  if (!currentWallpaper.value) {
    return
  }

  selectedCategory.value = currentWallpaper.value.category || ''
  categoryDialogVisible.value = true
}

const saveCategory = async () => {
  if (!currentWallpaper.value) {
    return
  }

  try {
    categoryLoading.value = true
    await updateImageCategory(currentWallpaper.value.id, selectedCategory.value)

    currentWallpaper.value.category = selectedCategory.value
    const index = wallpapers.value.findIndex((wallpaper) => wallpaper.id === currentWallpaper.value?.id)
    if (index !== -1) {
      wallpapers.value[index].category = selectedCategory.value
    }

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
  <div class="page-container home-view">
    <section class="hero-panel">
      <div>
        <span class="badge">CURATED WALLPAPER LIBRARY</span>
        <h1 class="page-title">发现下一张桌面主角</h1>
        <p class="page-description">
          用分类和关键词快速筛选海量壁纸，预览分辨率后再下载，减少试错成本。
        </p>
      </div>
      <div class="hero-metric card">
        <p class="metric-label">当前结果</p>
        <p class="metric-value">{{ filteredWallpapers.length }}</p>
        <p class="metric-sub">总库 {{ wallpapers.length }} 张</p>
      </div>
    </section>

    <section class="control-panel card">
      <div class="category-pills">
        <button
          v-for="item in categories"
          :key="item.value"
          type="button"
          class="category-pill"
          :class="{ 'is-active': activeCategory === item.value }"
          @click="handleCategoryChange(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <label class="search-box">
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
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          :value="searchKeyword"
          type="text"
          placeholder="搜索文件名..."
          @input="handleSearch(($event.target as HTMLInputElement).value)"
        />
      </label>
    </section>

    <section
      v-if="isLoading"
      class="loading-block"
    >
      <t-loading />
    </section>

    <section
      v-else-if="wallpapers.length === 0"
      class="empty-block"
    >
      没有找到壁纸，请先上传一些图片。
    </section>

    <section
      v-else-if="filteredWallpapers.length === 0"
      class="empty-block"
    >
      当前筛选条件下没有结果，换个关键词试试。
    </section>

    <section
      v-else
      class="wallpapers-grid"
    >
      <article
        v-for="wallpaper in filteredWallpapers"
        :key="wallpaper.id"
        class="wallpaper-card"
        @click="onOpenModal(wallpaper)"
      >
        <img
          :src="wallpaper.thumbnailUrl"
          :alt="wallpaper.fileName"
          loading="lazy"
        />

        <div class="wallpaper-overlay">
          <p
            class="wallpaper-name"
            :title="wallpaper.fileName"
          >
            {{ wallpaper.fileName }}
          </p>
          <p
            v-if="wallpaper.resolution"
            class="wallpaper-resolution"
          >
            {{ wallpaper.resolution.width }} × {{ wallpaper.resolution.height }}
          </p>
        </div>

        <span
          class="wallpaper-category"
          :class="wallpaper.category || 'default'"
        >
          {{ getCategoryLabel(wallpaper.category) }}
        </span>
      </article>
    </section>

    <t-dialog
      :visible="dialogVisible"
      :header="currentWallpaper?.fileName"
      attach="body"
      class="wallpaper-dialog"
      width="auto"
      top="5%"
      @close="onCloseDialog"
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
          <p><strong>上传时间：</strong>{{ formatUploadTime(currentWallpaper.uploadTime) }}</p>
          <p><strong>文件大小：</strong>{{ Math.round(currentWallpaper.fileSize / 1024) }} KB</p>
          <p><strong>图片分类：</strong>{{ getCategoryLabel(currentWallpaper.category) }}</p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <t-button
            theme="default"
            @click="openCategoryDialog"
          >
            设置分类
          </t-button>
          <t-button
            theme="default"
            @click="onCloseDialog"
          >
            关闭
          </t-button>
          <t-button
            theme="primary"
            :loading="loading"
            @click="handleDownload"
          >
            下载原图
          </t-button>
        </div>
      </template>
    </t-dialog>

    <t-dialog
      :visible="categoryDialogVisible"
      header="设置壁纸分类"
      attach="body"
      class="category-dialog"
      width="500px"
      @close="categoryDialogVisible = false"
    >
      <div class="category-form">
        <t-select
          v-model="selectedCategory"
          placeholder="请选择分类"
          clearable
        >
          <t-option
            v-for="item in categories.filter((category) => category.value !== 'all')"
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
          >
            取消
          </t-button>
          <t-button
            theme="primary"
            :loading="categoryLoading"
            @click="saveCategory"
          >
            保存
          </t-button>
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<style scoped>
.home-view {
  display: grid;
  gap: 20px;
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 230px;
  gap: 16px;
  align-items: stretch;
}

.hero-metric {
  background: linear-gradient(160deg, #2f67f4 0%, #1f4ecf 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 170px;
}

.metric-label {
  font-size: 13px;
  letter-spacing: 0.3px;
  opacity: 0.85;
}

.metric-value {
  font-family: var(--font-display);
  font-size: clamp(34px, 5vw, 56px);
  font-weight: 700;
  line-height: 1;
}

.metric-sub {
  font-size: 13px;
  opacity: 0.85;
}

.control-panel {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.category-pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.category-pill {
  min-height: 42px;
  padding: 9px 14px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: #fff;
  color: var(--text-secondary);
  font-weight: 600;
  transition: all 0.2s ease;
}

.category-pill:hover {
  border-color: var(--brand-400);
  color: var(--brand-600);
}

.category-pill.is-active {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(120deg, var(--brand-500), var(--brand-400));
  box-shadow: 0 10px 20px rgba(47, 103, 244, 0.32);
}

.search-box {
  width: min(100%, 360px);
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: #fff;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-tertiary);
}

.search-box:focus-within {
  border-color: var(--brand-400);
  box-shadow: 0 0 0 3px rgba(84, 129, 255, 0.16);
}

.search-box input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text-primary);
}

.search-box input::placeholder {
  color: #8b9ab0;
}

.wallpapers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 16px;
}

.wallpaper-card {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  border-radius: var(--border-radius);
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transform: translateY(0);
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease;
}

.wallpaper-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-hover);
}

.wallpaper-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wallpaper-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 12px;
  color: #fff;
  background: linear-gradient(to top, rgba(10, 21, 40, 0.9), rgba(10, 21, 40, 0.2), transparent);
}

.wallpaper-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wallpaper-resolution {
  font-family: 'Space Grotesk', monospace;
  font-size: 12px;
  opacity: 0.92;
}

.wallpaper-category {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #fff;
}

.wallpaper-category.nature {
  background: rgba(26, 151, 116, 0.88);
}

.wallpaper-category.beauty {
  background: rgba(216, 92, 68, 0.9);
}

.wallpaper-category.anime {
  background: rgba(58, 101, 222, 0.9);
}

.wallpaper-category.default {
  background: rgba(26, 46, 78, 0.72);
}

.dialog-content {
  display: grid;
  gap: 12px;
  width: min(92vw, 1200px);
}

.dialog-image {
  max-width: 100%;
  max-height: 74vh;
  object-fit: contain;
  border-radius: 14px;
}

.dialog-image-info {
  display: grid;
  gap: 4px;
  color: var(--text-secondary);
}

.dialog-image-info strong {
  color: var(--text-primary);
}

.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.category-form {
  padding: 10px 0;
}

.wallpaper-dialog :deep(.t-dialog) {
  border-radius: 20px;
}

.wallpaper-dialog :deep(.t-dialog__header) {
  font-family: var(--font-display);
}

@media (max-width: 1024px) {
  .hero-panel {
    grid-template-columns: 1fr;
  }

  .hero-metric {
    min-height: 120px;
  }
}

@media (max-width: 700px) {
  .control-panel {
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  .dialog-footer {
    justify-content: space-between;
    width: 100%;
  }
}
</style>
