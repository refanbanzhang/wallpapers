<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Loading, MessagePlugin, Option as TOption, Pagination as TPagination, Select as TSelect } from 'tdesign-vue-next'

import { getImages, removeImage, type ImageItem } from '@/api/index'
import ImageUpload from '@/components/ImageUpload.vue'
import { MAX_FILE_SIZE, DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_QUALITY, DEFAULT_THUMBNAIL_WIDTH } from '@/constants/constants'
import { formatDateTime, formatRelativeTime, uploadImageWithProgress } from '@/utils/experience'
import { readStorage, writeStorage } from '@/utils/storage'
import { formatFileSize } from '@/utils/upload'

interface ServerImage extends ImageItem {
  uploadTime: string
}

interface UploadedImage extends ServerImage {
  fileSizeLabel: string
}

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'

interface UploadQueueItem {
  id: string
  file: File
  fileName: string
  fileSizeLabel: string
  progress: number
  status: UploadStatus
  message: string
}

interface ManageViewState {
  searchKeyword: string
  activeCategory: string
  sortMode: string
  selectedCategory: string
  currentPage: number
  pageSize: number
}

const STATE_KEY = 'wallpaper_manage_view_state'

const defaultState: ManageViewState = {
  searchKeyword: '',
  activeCategory: 'all',
  sortMode: 'recent',
  selectedCategory: '',
  currentPage: 1,
  pageSize: 12,
}

const categoryOptions = [
  { value: '', label: '不设置分类' },
  { value: 'nature', label: '自然' },
  { value: 'beauty', label: '美女' },
  { value: 'anime', label: '动漫' },
]

const sortOptions = [
  { value: 'recent', label: '最新上传' },
  { value: 'oldest', label: '最早上传' },
  { value: 'name', label: '文件名' },
  { value: 'size', label: '文件大小' },
]

const uploadedImages = ref<UploadedImage[]>([])
const galleryLoading = ref(false)
const deletingId = ref('')
const searchKeyword = ref(defaultState.searchKeyword)
const activeCategory = ref(defaultState.activeCategory)
const sortMode = ref(defaultState.sortMode)
const selectedCategory = ref(defaultState.selectedCategory)
const currentPage = ref(defaultState.currentPage)
const pageSize = ref(defaultState.pageSize)
const isUploading = ref(false)
const uploadQueue = ref<UploadQueueItem[]>([])
const hydrated = ref(false)
let fetchToken = 0

const pageSizeOptions = [8, 12, 16, 24]

const sortedCategoryOptions = computed(() => [
  { value: 'all', label: `全部 (${uploadedImages.value.length})` },
  ...categoryOptions.slice(1).map((option) => ({
    ...option,
    label: `${option.label} (${getCategoryCount(option.value)})`,
  })),
])

const getCategoryLabel = (category?: string | null) => {
  if (!category) {
    return '未分类'
  }

  return categoryOptions.find((item) => item.value === category)?.label || '未分类'
}

const getCategoryCount = (category: string) => {
  if (category === 'all') {
    return uploadedImages.value.length
  }

  return uploadedImages.value.filter((image) => image.category === category).length
}

const getSortLabel = (value: string) => sortOptions.find((item) => item.value === value)?.label || '最新上传'

const filteredWallpapers = computed(() => {
  let filtered =
    activeCategory.value === 'all'
      ? uploadedImages.value
      : uploadedImages.value.filter((image) => image.category === activeCategory.value)

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter((image) => {
      const categoryLabel = getCategoryLabel(image.category).toLowerCase()
      return [image.fileName.toLowerCase(), categoryLabel].some((item) => item.includes(keyword))
    })
  }

  const sorted = [...filtered]
  switch (sortMode.value) {
    case 'oldest':
      sorted.sort((a, b) => new Date(a.uploadTime).getTime() - new Date(b.uploadTime).getTime())
      break
    case 'name':
      sorted.sort((a, b) => a.fileName.localeCompare(b.fileName, 'zh-Hans-CN'))
      break
    case 'size':
      sorted.sort((a, b) => b.fileSize - a.fileSize)
      break
    case 'recent':
    default:
      sorted.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime())
      break
  }

  return sorted
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredWallpapers.value.length / pageSize.value)))

const pagedImages = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  return filteredWallpapers.value.slice(startIndex, startIndex + pageSize.value)
})

const activeFilterSummary = computed(() => {
  const summary: string[] = []

  if (searchKeyword.value) {
    summary.push(`关键词：${searchKeyword.value}`)
  }

  if (activeCategory.value !== 'all') {
    summary.push(`分类：${getCategoryLabel(activeCategory.value)}`)
  }

  if (sortMode.value !== 'recent') {
    summary.push(`排序：${getSortLabel(sortMode.value)}`)
  }

  return summary
})

const latestUploadTime = computed(() => {
  if (uploadedImages.value.length === 0) {
    return ''
  }

  return uploadedImages.value.reduce((latest, item) => {
    if (!latest) {
      return item.uploadTime
    }

    return new Date(item.uploadTime).getTime() > new Date(latest).getTime() ? item.uploadTime : latest
  }, '')
})

const latestUploadLabel = computed(() => {
  if (!latestUploadTime.value) {
    return '等待新的上传批次'
  }

  return `最近上传 ${formatRelativeTime(latestUploadTime.value)}`
})

const uploadStats = computed(() => {
  const total = uploadQueue.value.length
  const success = uploadQueue.value.filter((item) => item.status === 'success').length
  const failed = uploadQueue.value.filter((item) => item.status === 'error').length
  const uploading = uploadQueue.value.filter((item) => item.status === 'uploading').length

  return { total, success, failed, uploading }
})

const uploadOverallProgress = computed(() => {
  if (uploadQueue.value.length === 0) {
    return 0
  }

  const progress = uploadQueue.value.reduce((sum, item) => sum + item.progress, 0)
  return Math.round(progress / uploadQueue.value.length)
})

const uploadSummaryText = computed(() => {
  const { total, success, failed, uploading } = uploadStats.value

  if (total === 0) {
    return '等待选择文件'
  }

  if (isUploading.value) {
    return `正在上传 ${uploading}/${total} 张`
  }

  if (failed > 0) {
    return `已完成 ${success} 张，${failed} 张失败`
  }

  return `全部完成，共 ${success} 张`
})

const uploadProgressHint = computed(() => {
  const categoryLabel = getCategoryLabel(selectedCategory.value)
  return selectedCategory.value ? `默认分类：${categoryLabel}` : '上传前可先选分类，后续浏览更容易筛选'
})

const isFilterActive = computed(
  () =>
    Boolean(searchKeyword.value) || activeCategory.value !== 'all' || sortMode.value !== 'recent',
)

const uploadStatusLabel = (status: UploadStatus) => {
  switch (status) {
    case 'uploading':
      return '上传中'
    case 'success':
      return '已完成'
    case 'error':
      return '失败'
    default:
      return '等待中'
  }
}

const persistState = () => {
  if (!hydrated.value) {
    return
  }

  writeStorage(STATE_KEY, {
    searchKeyword: searchKeyword.value,
    activeCategory: activeCategory.value,
    sortMode: sortMode.value,
    selectedCategory: selectedCategory.value,
    currentPage: currentPage.value,
    pageSize: pageSize.value,
  })
}

const restoreState = () => {
  const state = readStorage<ManageViewState>(STATE_KEY, defaultState)
  searchKeyword.value = state.searchKeyword ?? defaultState.searchKeyword
  activeCategory.value = state.activeCategory ?? defaultState.activeCategory
  sortMode.value = state.sortMode ?? defaultState.sortMode
  selectedCategory.value = state.selectedCategory ?? defaultState.selectedCategory
  currentPage.value = state.currentPage || defaultState.currentPage
  pageSize.value = state.pageSize || defaultState.pageSize
}

const fetchUploadedImages = async () => {
  const token = ++fetchToken

  try {
    galleryLoading.value = true
    const images = await getImages()

    if (token !== fetchToken) {
      return
    }

    uploadedImages.value = images.map((image) => ({
      ...image,
      fileSizeLabel: formatFileSize(image.fileSize),
    }))
  } catch (error) {
    if (token !== fetchToken) {
      return
    }

    console.error('获取图片列表失败:', error)
    MessagePlugin.error('获取图片列表失败')
  } finally {
    if (token === fetchToken) {
      galleryLoading.value = false
    }
  }
}

const updateQueueItem = (id: string, patch: Partial<UploadQueueItem>) => {
  uploadQueue.value = uploadQueue.value.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

const handleUploadSuccess = async (files: File[]) => {
  if (files.length === 0) {
    return
  }

  uploadQueue.value = files.map((file, index) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
    file,
    fileName: file.name,
    fileSizeLabel: formatFileSize(file.size),
    progress: 0,
    status: 'pending',
    message: '等待上传',
  }))

  isUploading.value = true

  try {
    await Promise.all(
      uploadQueue.value.map(async (item) => {
        updateQueueItem(item.id, { status: 'uploading', progress: 8, message: '正在上传' })

        try {
          await uploadImageWithProgress(item.file, selectedCategory.value, (progress) => {
            updateQueueItem(item.id, {
              progress,
              message: progress >= 100 ? '上传完成，等待服务确认' : `上传中 ${progress}%`,
            })
          })

          updateQueueItem(item.id, {
            status: 'success',
            progress: 100,
            message: '上传成功',
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '上传失败'
          updateQueueItem(item.id, {
            status: 'error',
            progress: 100,
            message,
          })
        }
      }),
    )

    await fetchUploadedImages()

    if (uploadStats.value.failed > 0) {
      MessagePlugin.warning(`已上传 ${uploadStats.value.success} 张，${uploadStats.value.failed} 张失败`)
    } else {
      MessagePlugin.success(`成功上传 ${uploadStats.value.success} 张图片`)
    }
  } catch (error) {
    console.error('批量上传失败:', error)
    MessagePlugin.error(`批量上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    isUploading.value = false
  }
}

const refreshImages = async () => {
  await fetchUploadedImages()
}

const handleSearch = (value: string) => {
  searchKeyword.value = value
  currentPage.value = 1
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

const resetFilters = async () => {
  searchKeyword.value = defaultState.searchKeyword
  activeCategory.value = defaultState.activeCategory
  sortMode.value = defaultState.sortMode
  currentPage.value = defaultState.currentPage
  await fetchUploadedImages()
  MessagePlugin.info('已恢复默认浏览视图')
}

const clearUploadQueue = () => {
  if (isUploading.value) {
    return
  }

  uploadQueue.value = []
}

const handleDeleteImage = async (image: UploadedImage) => {
  const confirmed = window.confirm(`确认删除图片「${image.fileName}」吗？`)
  if (!confirmed) {
    return
  }

  try {
    deletingId.value = image.id
    await removeImage(image.id)
    uploadedImages.value = uploadedImages.value.filter((item) => item.id !== image.id)
    MessagePlugin.success('图片已删除')
  } catch (error) {
    console.error('删除图片失败:', error)
    MessagePlugin.error(error instanceof Error ? error.message : '删除图片失败')
  } finally {
    deletingId.value = ''
  }
}

watch(
  [searchKeyword, activeCategory, sortMode, selectedCategory, currentPage, pageSize],
  persistState,
)

watch([filteredWallpapers, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

onMounted(() => {
  restoreState()
  hydrated.value = true
  fetchUploadedImages()
})
</script>

<template>
  <div class="page-container upload-view">
    <section class="upload-hero">
      <div class="page-copy">
        <span class="badge">UPLOAD WORKFLOW</span>
        <h1 class="page-title">上传并整理你的壁纸素材</h1>
        <p class="page-description">
          拖拽即可批量上传，实时看到每张图片的处理进度。分类、筛选和分页会自动记住，回来后可以继续上次的工作。
        </p>
      </div>
      <div class="hero-stats card">
        <p class="stats-label">已收录图片</p>
        <p class="stats-value">{{ uploadedImages.length }}</p>
        <p class="stats-sub">{{ filteredWallpapers.length }} 张符合当前筛选</p>
        <p class="stats-foot">{{ latestUploadLabel }}</p>
      </div>
    </section>

    <section class="card upload-panel">
      <div class="panel-head">
        <div class="page-copy">
          <h2 class="section-title">上传中心</h2>
          <p class="panel-note">
            建议图片宽度不低于 1920px。默认分类会被记住，下一批上传可以直接接着用。
          </p>
        </div>
        <button type="button" class="tool-btn" :disabled="isUploading || uploadQueue.length === 0" @click="clearUploadQueue">
          清空进度
        </button>
      </div>

      <div v-if="uploadQueue.length" class="upload-progress-panel">
        <div class="upload-progress-head">
          <div>
            <p class="upload-progress-label">{{ uploadSummaryText }}</p>
            <p class="upload-progress-meta">{{ uploadProgressHint }}</p>
          </div>
          <div class="upload-progress-stat">
            <strong>{{ uploadOverallProgress }}%</strong>
            <span>{{ uploadQueue.length }} 张</span>
          </div>
        </div>

        <div class="progress-track progress-track--large">
          <div
            class="progress-fill"
            :class="{
              success: !isUploading && uploadStats.failed === 0,
              error: !isUploading && uploadStats.failed > 0,
              active: isUploading,
            }"
            :style="{ width: `${uploadOverallProgress}%` }"
          />
        </div>

        <div class="upload-list">
          <article v-for="item in uploadQueue" :key="item.id" class="upload-item">
            <div class="upload-item-head">
              <span class="upload-name" :title="item.fileName">{{ item.fileName }}</span>
              <span class="upload-badge" :class="item.status">{{ uploadStatusLabel(item.status) }}</span>
            </div>
            <div class="upload-item-meta">
              <span>{{ item.fileSizeLabel }}</span>
              <span>{{ item.message }}</span>
            </div>
            <div class="progress-track progress-track--thin">
              <div class="progress-fill" :class="item.status" :style="{ width: `${item.progress}%` }" />
            </div>
          </article>
        </div>
      </div>

      <div class="category-picker">
        <button
          v-for="item in categoryOptions"
          :key="item.value || 'none'"
          type="button"
          class="category-option"
          :class="{ active: selectedCategory === item.value }"
          @click="selectedCategory = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <ImageUpload
        multiple
        :max-file-size="MAX_FILE_SIZE"
        :thumbnail-width="DEFAULT_THUMBNAIL_WIDTH"
        :thumbnail-height="DEFAULT_THUMBNAIL_HEIGHT"
        :thumbnail-quality="DEFAULT_THUMBNAIL_QUALITY"
        @upload-success="handleUploadSuccess"
      />
    </section>

    <section v-if="galleryLoading && uploadedImages.length === 0" class="loading-block">
      <div class="loading-inner">
        <Loading size="medium" />
        <span>正在加载图片列表...</span>
      </div>
    </section>

    <section v-else-if="uploadedImages.length === 0" class="empty-block">
      <div class="empty-copy">
        <p>暂无上传记录，先来上传第一张壁纸。</p>
      </div>
    </section>

    <section v-else class="card gallery-panel">
      <div class="gallery-head">
        <div class="page-copy">
          <h2 class="section-title">图片管理</h2>
          <p class="panel-note">筛选条件会自动保存。你可以返回这里继续上次的浏览状态。</p>
        </div>
        <div class="gallery-tools">
          <span class="gallery-count">{{ filteredWallpapers.length }} / {{ uploadedImages.length }}</span>
          <button type="button" class="tool-btn" :disabled="galleryLoading" @click="refreshImages">
            刷新
          </button>
          <button
            type="button"
            class="tool-btn"
            :disabled="!isFilterActive"
            @click="resetFilters"
          >
            恢复默认
          </button>
        </div>
      </div>

      <div class="gallery-toolbar">
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
            placeholder="搜索文件名或分类..."
            @input="handleSearch(($event.target as HTMLInputElement).value)"
          />
        </label>

        <t-select v-model="sortMode" class="sort-select" size="small">
          <t-option v-for="item in sortOptions" :key="item.value" :value="item.value" :label="item.label" />
        </t-select>
      </div>

      <div v-if="activeFilterSummary.length" class="filter-summary">
        <span v-for="item in activeFilterSummary" :key="item" class="filter-chip">{{ item }}</span>
      </div>

      <div class="category-pills">
        <button
          v-for="item in sortedCategoryOptions"
          :key="item.value"
          type="button"
          class="category-pill"
          :class="{ 'is-active': activeCategory === item.value }"
          @click="handleCategoryChange(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <section v-if="filteredWallpapers.length === 0" class="empty-block empty-block--compact">
        <div class="empty-copy">
          <p>当前筛选条件下没有结果。</p>
          <button type="button" class="tool-btn" @click="resetFilters">清空筛选</button>
        </div>
      </section>

      <div v-else class="gallery-grid">
        <article v-for="image in pagedImages" :key="image.id" class="gallery-card">
          <img :src="image.thumbnailUrl" :alt="image.fileName" loading="lazy" />
          <div class="gallery-info">
            <p class="filename" :title="image.fileName">{{ image.fileName }}</p>
            <p>{{ image.fileSizeLabel }}</p>
            <p>{{ getCategoryLabel(image.category) }}</p>
            <p>{{ formatDateTime(image.uploadTime) }}</p>
            <button
              type="button"
              class="delete-btn"
              :disabled="deletingId === image.id"
              @click.stop="handleDeleteImage(image)"
            >
              {{ deletingId === image.id ? '删除中...' : '删除' }}
            </button>
          </div>
        </article>
      </div>

      <div v-if="filteredWallpapers.length > pageSize" class="gallery-pagination">
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
      </div>
    </section>
  </div>
</template>

<style scoped>
.upload-view {
  display: grid;
  gap: 20px;
}

.upload-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 14px;
  align-items: stretch;
}

.upload-hero > div:first-child {
  padding: clamp(18px, 2.4vw, 28px);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: #fafafa;
}

.hero-stats {
  background: #ffffff;
  color: #1f1f1f;
  display: grid;
  place-content: center;
  gap: 6px;
  border: 1px solid var(--border-color);
}

.stats-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.stats-value {
  font-family: var(--font-display);
  font-size: clamp(34px, 6vw, 54px);
  line-height: 1;
  font-weight: 600;
}

.stats-sub {
  font-size: 13px;
  color: var(--text-secondary);
}

.stats-foot {
  font-size: 12px;
  color: var(--text-tertiary);
}

.upload-panel,
.gallery-panel {
  display: grid;
  gap: 20px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-note {
  color: var(--text-secondary);
  font-size: 14px;
}

.upload-progress-panel {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
}

.upload-progress-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.upload-progress-label {
  color: var(--text-primary);
  font-weight: 700;
}

.upload-progress-meta {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.upload-progress-stat {
  display: grid;
  justify-items: end;
  gap: 2px;
  color: var(--text-secondary);
}

.upload-progress-stat strong {
  color: var(--text-primary);
  font-size: 24px;
  line-height: 1;
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  background: #ececec;
  overflow: hidden;
}

.progress-track--large {
  height: 10px;
}

.progress-track--thin {
  height: 6px;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #787878, #222222);
  transition: width 0.24s ease;
}

.progress-fill.active {
  background: linear-gradient(90deg, #3b3b3b, #111111);
}

.progress-fill.success {
  background: linear-gradient(90deg, #4d6b57, #1e4733);
}

.progress-fill.error {
  background: linear-gradient(90deg, #b76d67, #8f3a34);
}

.upload-list {
  display: grid;
  gap: 10px;
}

.upload-item {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: #ffffff;
  display: grid;
  gap: 8px;
}

.upload-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.upload-name {
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-badge {
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: #f2f2f2;
  color: var(--text-secondary);
}

.upload-badge.uploading {
  background: #eef3fb;
  color: #35507a;
}

.upload-badge.success {
  background: #eef7ef;
  color: #2f6240;
}

.upload-badge.error {
  background: #fef0ef;
  color: #9f3f37;
}

.upload-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.category-picker,
.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-option,
.category-pill {
  min-height: 42px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: #ffffff;
  color: var(--text-secondary);
  font-weight: 600;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.22s ease;
}

.category-option:hover,
.category-pill:hover {
  color: #1f1f1f;
  transform: translateY(-1px);
  border-color: #bcbcbc;
  background: #f7f7f7;
}

.category-option.active,
.category-pill.is-active {
  border-color: #222222;
  background: #222222;
  color: #ffffff;
}

.loading-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
}

.gallery-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
}

.gallery-tools {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.gallery-count {
  color: var(--text-primary);
  font-weight: 700;
}

.tool-btn {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  color: var(--text-secondary);
  background: #ffffff;
  font-weight: 600;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.tool-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #bcbcbc;
  background: #f7f7f7;
}

.gallery-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.search-box {
  flex: 1 1 320px;
  max-width: 560px;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  background: #ffffff;
  color: var(--text-secondary);
}

.search-box input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
}

.sort-select {
  min-width: 180px;
}

.filter-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  min-height: 30px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: #f7f7f7;
  color: var(--text-secondary);
  font-size: 12px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 16px;
}

.gallery-pagination {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.gallery-card {
  overflow: hidden;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: #ffffff;
  box-shadow: 0 3px 10px rgba(17, 17, 17, 0.07);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.gallery-card:hover {
  transform: translateY(-2px);
  border-color: #cccccc;
  box-shadow: 0 8px 20px rgba(17, 17, 17, 0.12);
}

.gallery-card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.gallery-info {
  padding: 10px;
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.filename {
  color: var(--text-primary);
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  min-height: 32px;
  border-radius: 999px;
  border: 1px solid #dc8f8a;
  background: #fff6f5;
  color: #a53c35;
  font-size: 12px;
  font-weight: 700;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.delete-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #c96d66;
  background: #ffefed;
}

.delete-btn:disabled,
.tool-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-block--compact {
  min-height: 160px;
}

.empty-copy {
  display: grid;
  gap: 10px;
  justify-items: center;
  text-align: center;
}

.empty-copy p {
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .upload-hero {
    grid-template-columns: 1fr;
  }

  .panel-head,
  .gallery-head {
    flex-direction: column;
  }

  .gallery-tools {
    justify-content: flex-start;
  }
}
</style>
