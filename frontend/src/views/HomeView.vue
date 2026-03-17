<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  Dialog as TDialog,
  Button as TButton,
  Loading as TLoading,
  Select as TSelect,
  Option as TOption,
  Pagination as TPagination,
  MessagePlugin,
} from 'tdesign-vue-next'
import { downloadWallpaper } from '@/utils/download'
import { getImages, trackVisit, updateImageCategory } from '@/api/index'
import { hasManagePermission } from '@/utils/auth'

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
const resolutionLoading = ref(false)
const isLoading = ref(false)
const activeCategory = ref('all')
const currentPage = ref(1)
const pageSize = ref(16)
const pageSizeOptions = [12, 16, 24, 36]

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

const totalPages = computed(() => Math.max(1, Math.ceil(filteredWallpapers.value.length / pageSize.value)))

const pagedWallpapers = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  return filteredWallpapers.value.slice(startIndex, startIndex + pageSize.value)
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
  } catch (error) {
    console.error('获取壁纸列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

const handleSearch = (value: string) => {
  searchKeyword.value = value
  currentPage.value = 1

  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  searchTimeout.value = window.setTimeout(() => {
    fetchWallpapers(value)
  }, 450)
}

const handleCategoryChange = (value: string) => {
  activeCategory.value = value
  currentPage.value = 1
}

const handleCurrentChange = (nextPage: number) => {
  currentPage.value = nextPage
}

const handlePageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize
  currentPage.value = 1
}

onMounted(() => {
  trackVisit(window.location.pathname).catch((error) => {
    console.error('访问统计上报失败:', error)
  })
  fetchWallpapers()
})

watch([filteredWallpapers, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

const onOpenModal = (wallpaper: Wallpaper) => {
  currentWallpaper.value = wallpaper
  resolutionLoading.value = !wallpaper.resolution
  dialogVisible.value = true
}

const onCloseDialog = () => {
  dialogVisible.value = false
  currentWallpaper.value = null
  resolutionLoading.value = false
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
  if (!currentWallpaper.value || !hasManagePermission.value) {
    return
  }

  selectedCategory.value = currentWallpaper.value.category || ''
  categoryDialogVisible.value = true
}

const saveCategory = async () => {
  if (!currentWallpaper.value || !hasManagePermission.value) {
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

const handleDialogImageLoad = (event: Event) => {
  const image = event.target as HTMLImageElement | null
  if (!currentWallpaper.value || !image) {
    return
  }

  currentWallpaper.value.resolution = {
    width: image.naturalWidth,
    height: image.naturalHeight,
  }
  resolutionLoading.value = false
}

const handleDialogImageError = () => {
  resolutionLoading.value = false
}
</script>

<template>
  <div class="page-container home-view">
    <section class="hero-panel">
      <div class="page-copy">
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
        v-for="wallpaper in pagedWallpapers"
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
            class="wallpaper-resolution"
          >
            点击查看原图
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

    <section
      v-if="filteredWallpapers.length > pageSize"
      class="pagination-wrap card"
    >
      <t-pagination
        :current="currentPage"
        :page-size="pageSize"
        :total="filteredWallpapers.length"
        :page-size-options="pageSizeOptions"
        show-page-size
        show-jumper
        size="small"
        @current-change="handleCurrentChange"
        @page-size-change="handlePageSizeChange"
      />
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
          @load="handleDialogImageLoad"
          @error="handleDialogImageError"
        />

        <div class="dialog-image-info">
          <p class="info-row">
            <strong>上传时间</strong>
            <span>{{ formatUploadTime(currentWallpaper.uploadTime) }}</span>
          </p>
          <p class="info-row">
            <strong>文件大小</strong>
            <span>{{ Math.round(currentWallpaper.fileSize / 1024) }} KB</span>
          </p>
          <p class="info-row">
            <strong>图片分类</strong>
            <span>{{ getCategoryLabel(currentWallpaper.category) }}</span>
          </p>
          <p class="info-row">
            <strong>分辨率</strong>
            <span>
              {{
                resolutionLoading
                  ? '读取中...'
                  : currentWallpaper.resolution
                    ? `${currentWallpaper.resolution.width} × ${currentWallpaper.resolution.height}`
                    : '未知'
              }}
            </span>
          </p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <t-button
            v-if="hasManagePermission"
            theme="default"
            @click="openCategoryDialog"
          >
            设置分类
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
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 14px;
  align-items: stretch;
}

.hero-panel > div:first-child {
  padding: clamp(18px, 2.4vw, 28px);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: #fafafa;
}

.hero-metric {
  background: #ffffff;
  color: #1f1f1f;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 170px;
  border: 1px solid var(--border-color);
}

.metric-label {
  font-size: 13px;
  letter-spacing: 0.2px;
  color: var(--text-secondary);
}

.metric-value {
  font-family: var(--font-display);
  font-size: clamp(34px, 5vw, 52px);
  font-weight: 600;
  line-height: 1;
}

.metric-sub {
  font-size: 13px;
  color: var(--text-tertiary);
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
  padding: 9px 15px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: #ffffff;
  color: var(--text-secondary);
  font-weight: 600;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.category-pill:hover {
  color: #1f1f1f;
  transform: translateY(-1px);
  border-color: #bcbcbc;
  background: #f7f7f7;
}

.category-pill.is-active {
  border-color: #222222;
  color: #ffffff;
  background: #222222;
}

.search-box {
  width: min(100%, 360px);
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: #ffffff;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-tertiary);
}

.search-box:focus-within {
  border-color: #8c8c8c;
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
}

.search-box input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text-primary);
}

.search-box input::placeholder {
  color: #aaaaaa;
}

.wallpapers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 16px;
}

.pagination-wrap {
  padding: 14px 16px;
  display: flex;
  justify-content: center;
}

.wallpaper-card {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 1px solid var(--border-color);
  box-shadow: 0 3px 10px rgba(17, 17, 17, 0.07);
  transform: translateY(0);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.wallpaper-card:hover {
  transform: translateY(-2px);
  border-color: #cccccc;
  box-shadow: 0 8px 20px rgba(17, 17, 17, 0.12);
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
  padding: 12px 12px 11px;
  color: #ffffff;
  background: linear-gradient(to top, rgba(17, 17, 17, 0.72), rgba(17, 17, 17, 0.22), transparent);
}

.wallpaper-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wallpaper-resolution {
  font-family: var(--font-body);
  font-size: 12px;
  opacity: 0.9;
}

.wallpaper-category {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.22px;
  color: #555555;
  border: 1px solid #d8d8d8;
  background: rgba(255, 255, 255, 0.88);
}

.wallpaper-category.nature {
  border-color: #cadfce;
  background: #eef6f0;
  color: #3f6448;
}

.wallpaper-category.beauty {
  border-color: #e6cdcd;
  background: #f8efef;
  color: #7d4d4d;
}

.wallpaper-category.anime {
  border-color: #d4daea;
  background: #eff2f8;
  color: #4d5f7d;
}

.wallpaper-category.default {
  background: #f3f3f3;
}

.dialog-content {
  display: grid;
  gap: 14px;
  width: min(92vw, 1160px);
}

.dialog-image {
  max-width: 100%;
  max-height: 74vh;
  object-fit: contain;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 18px rgba(17, 17, 17, 0.1);
}

.dialog-image-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.info-row {
  margin: 0;
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: #fafafa;
}

.info-row span {
  color: var(--text-secondary);
  font-size: 13px;
}

.info-row strong {
  font-size: 12px;
  letter-spacing: 0.2px;
  color: #2a2a2a;
}

.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.category-form {
  padding: 8px 0;
}

.wallpaper-dialog :deep(.t-dialog) {
  width: min(94vw, 1240px);
}

.category-dialog :deep(.t-dialog) {
  max-width: min(92vw, 520px);
}

.wallpaper-dialog :deep(.t-button),
.category-dialog :deep(.t-button) {
  min-width: 94px;
}

@media (max-width: 1024px) {
  .hero-panel {
    grid-template-columns: 1fr;
  }

  .hero-metric {
    min-height: 120px;
  }

  .dialog-image-info {
    grid-template-columns: 1fr;
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
    justify-content: flex-end;
    flex-wrap: wrap;
    width: 100%;
  }
}
</style>
