<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Dialog as TDialog,
  Button as TButton,
  Loading as TLoading,
  Select as TSelect,
  Option as TOption,
  Pagination as TPagination,
  MessagePlugin,
} from 'tdesign-vue-next'

import { getImages, trackVisit, updateImageCategory } from '@/api/index'
import { hasManagePermission } from '@/utils/auth'
import { downloadWallpaper } from '@/utils/download'
import { readStorage, readStorageString, writeStorage, writeStorageString } from '@/utils/storage'

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

interface HighlightSegment {
  text: string
  match: boolean
}

const route = useRoute()
const router = useRouter()

const categories = [
  { value: 'all', label: '全部' },
  { value: 'nature', label: '自然' },
  { value: 'beauty', label: '美女' },
  { value: 'anime', label: '动漫' },
]

const HOME_FILTERS_KEY = 'wallpaper_home_filters'
const HOME_FAVORITES_KEY = 'wallpaper_home_favorites'
const HOME_RECENTS_KEY = 'wallpaper_home_recents'
const HOME_LAST_VIEWED_KEY = 'wallpaper_home_last_viewed'

const wallpapers = ref<Wallpaper[]>([])
const dialogVisible = ref(false)
const currentWallpaper = ref<Wallpaper | null>(null)
const loading = ref(false)
const resolutionLoading = ref(false)
const isLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(16)
const pageSizeOptions = [12, 16, 24, 36]

const savedFilters = readStorage(HOME_FILTERS_KEY, {
  category: 'all',
  keyword: '',
  sort: 'latest',
  density: 'comfortable',
})

const activeCategory = ref(savedFilters.category)
const searchKeyword = ref(savedFilters.keyword)
const sortOption = ref(savedFilters.sort)
const density = ref(savedFilters.density)
const searchInput = ref(savedFilters.keyword)
const searchTimeout = ref<number | null>(null)

const favoriteIds = ref<string[]>(readStorage(HOME_FAVORITES_KEY, []))
const recentIds = ref<string[]>(readStorage(HOME_RECENTS_KEY, []))
const categoryDialogVisible = ref(false)
const selectedCategory = ref('')
const categoryLoading = ref(false)

const filteredWallpapers = computed(() => {
  let filtered =
    activeCategory.value === 'all'
      ? [...wallpapers.value]
      : wallpapers.value.filter((wallpaper) => wallpaper.category === activeCategory.value)

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    filtered = filtered.filter((wallpaper) => wallpaper.fileName.toLowerCase().includes(keyword))
  }

  switch (sortOption.value) {
    case 'name-asc':
      filtered.sort((a, b) => a.fileName.localeCompare(b.fileName))
      break
    case 'name-desc':
      filtered.sort((a, b) => b.fileName.localeCompare(a.fileName))
      break
    case 'size-desc':
      filtered.sort((a, b) => b.fileSize - a.fileSize)
      break
    case 'size-asc':
      filtered.sort((a, b) => a.fileSize - b.fileSize)
      break
    case 'latest':
    default:
      filtered.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime())
      break
  }

  return filtered
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredWallpapers.value.length / pageSize.value)))

const pagedWallpapers = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  return filteredWallpapers.value.slice(startIndex, startIndex + pageSize.value)
})

const favoriteSet = computed(() => new Set(favoriteIds.value))
const favoriteWallpapers = computed(() =>
  wallpapers.value.filter((wallpaper) => favoriteSet.value.has(wallpaper.id)),
)
const recentWallpapers = computed(() =>
  recentIds.value
    .map((id) => wallpapers.value.find((wallpaper) => wallpaper.id === id))
    .filter((wallpaper): wallpaper is Wallpaper => Boolean(wallpaper))
    .slice(0, 3),
)
const continueWallpaper = computed(() => {
  const id = readStorageString(HOME_LAST_VIEWED_KEY)
  return wallpapers.value.find((wallpaper) => wallpaper.id === id) || null
})
const currentWallpaperIndex = computed(() =>
  currentWallpaper.value
    ? filteredWallpapers.value.findIndex((wallpaper) => wallpaper.id === currentWallpaper.value?.id)
    : -1,
)
const canGoPrev = computed(() => currentWallpaperIndex.value > 0)
const canGoNext = computed(
  () =>
    currentWallpaperIndex.value !== -1 &&
    currentWallpaperIndex.value < filteredWallpapers.value.length - 1,
)
const filterSummary = computed(() => {
  const parts: string[] = []
  if (activeCategory.value !== 'all') {
    parts.push(`分类：${getCategoryLabel(activeCategory.value)}`)
  }
  if (searchKeyword.value.trim()) {
    parts.push(`关键词：${searchKeyword.value.trim()}`)
  }
  parts.push(`排序：${getSortLabel(sortOption.value)}`)
  parts.push(`视图：${density.value === 'compact' ? '紧凑' : '舒展'}`)
  return parts.join(' · ')
})
const hasActiveFilters = computed(
  () =>
    activeCategory.value !== 'all' ||
    Boolean(searchKeyword.value.trim()) ||
    sortOption.value !== 'latest' ||
    density.value !== 'comfortable',
)

const getCategoryLabel = (category?: string | null) => {
  if (!category) {
    return '未分类'
  }
  return categories.find((item) => item.value === category)?.label || '未分类'
}

const getSortLabel = (value: string) => {
  const options: Record<string, string> = {
    latest: '最新上传',
    'name-asc': '名称 A-Z',
    'name-desc': '名称 Z-A',
    'size-desc': '大图优先',
    'size-asc': '小图优先',
  }
  return options[value] || '最新上传'
}

const formatUploadTime = (uploadTime: string) => {
  const date = new Date(uploadTime)
  return Number.isNaN(date.getTime()) ? uploadTime : date.toLocaleString()
}

const formatFileSize = (fileSize: number) => {
  if (fileSize < 1024) {
    return `${fileSize} B`
  }
  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`
  }
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
}

const highlightFileName = (fileName: string): HighlightSegment[] => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    return [{ text: fileName, match: false }]
  }

  const lowerName = fileName.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const segments: HighlightSegment[] = []
  let cursor = 0

  while (cursor < fileName.length) {
    const nextIndex = lowerName.indexOf(lowerKeyword, cursor)
    if (nextIndex === -1) {
      segments.push({ text: fileName.slice(cursor), match: false })
      break
    }

    if (nextIndex > cursor) {
      segments.push({ text: fileName.slice(cursor, nextIndex), match: false })
    }

    segments.push({
      text: fileName.slice(nextIndex, nextIndex + keyword.length),
      match: true,
    })
    cursor = nextIndex + keyword.length
  }

  return segments
}

const persistFilters = () => {
  writeStorage(HOME_FILTERS_KEY, {
    category: activeCategory.value,
    keyword: searchKeyword.value,
    sort: sortOption.value,
    density: density.value,
  })
}

const fetchWallpapers = async (search = '') => {
  try {
    isLoading.value = true
    const data = await getImages(search)
    wallpapers.value = data
    applyRouteFocus()
  } catch (error) {
    console.error('获取壁纸列表失败:', error)
    MessagePlugin.error('获取壁纸列表失败')
  } finally {
    isLoading.value = false
  }
}

const handleSearch = (value: string) => {
  searchInput.value = value
  currentPage.value = 1

  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  searchTimeout.value = window.setTimeout(() => {
    searchKeyword.value = value
    fetchWallpapers(value)
  }, 350)
}

const clearSearch = () => {
  handleSearch('')
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

const rememberRecent = (wallpaperId: string) => {
  recentIds.value = [wallpaperId, ...recentIds.value.filter((id) => id !== wallpaperId)].slice(0, 8)
  writeStorage(HOME_RECENTS_KEY, recentIds.value)
  writeStorageString(HOME_LAST_VIEWED_KEY, wallpaperId)
}

const onOpenModal = (wallpaper: Wallpaper) => {
  currentWallpaper.value = wallpaper
  resolutionLoading.value = !wallpaper.resolution
  dialogVisible.value = true
  rememberRecent(wallpaper.id)
}

const onCloseDialog = () => {
  dialogVisible.value = false
  currentWallpaper.value = null
  resolutionLoading.value = false
}

const openByIndex = (index: number) => {
  const wallpaper = filteredWallpapers.value[index]
  if (!wallpaper) {
    return
  }
  onOpenModal(wallpaper)
}

const handleKeyboard = (event: KeyboardEvent) => {
  if (!dialogVisible.value) {
    return
  }

  if (event.key === 'Escape') {
    onCloseDialog()
    return
  }

  if (event.key === 'ArrowLeft' && canGoPrev.value) {
    openByIndex(currentWallpaperIndex.value - 1)
  }

  if (event.key === 'ArrowRight' && canGoNext.value) {
    openByIndex(currentWallpaperIndex.value + 1)
  }
}

const handleDownload = async (wallpaper = currentWallpaper.value) => {
  if (!wallpaper) {
    return
  }

  try {
    loading.value = true
    const imageName = wallpaper.fileName || `wallpaper-${wallpaper.id}`
    await downloadWallpaper(wallpaper.originalUrl, imageName)
    MessagePlugin.success(`已开始下载 ${imageName}`)
  } catch (error) {
    console.error('下载失败', error)
    MessagePlugin.error('下载失败')
  } finally {
    loading.value = false
  }
}

const toggleFavorite = (wallpaper: Wallpaper, event?: MouseEvent) => {
  event?.stopPropagation()

  favoriteIds.value = favoriteSet.value.has(wallpaper.id)
    ? favoriteIds.value.filter((id) => id !== wallpaper.id)
    : [wallpaper.id, ...favoriteIds.value]

  writeStorage(HOME_FAVORITES_KEY, favoriteIds.value)
}

const quickDownload = async (wallpaper: Wallpaper, event: MouseEvent) => {
  event.stopPropagation()
  await handleDownload(wallpaper)
}

const pickRandomWallpaper = () => {
  if (filteredWallpapers.value.length === 0) {
    return
  }

  const index = Math.floor(Math.random() * filteredWallpapers.value.length)
  onOpenModal(filteredWallpapers.value[index])
}

const resetFilters = () => {
  activeCategory.value = 'all'
  sortOption.value = 'latest'
  density.value = 'comfortable'
  currentPage.value = 1
  clearSearch()
}

const resumeLastViewed = () => {
  if (continueWallpaper.value) {
    onOpenModal(continueWallpaper.value)
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
    console.error('设置分类失败:', error)
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

const applyRouteFocus = () => {
  const focusId = typeof route.query.focus === 'string' ? route.query.focus : ''
  if (!focusId || dialogVisible.value) {
    return
  }

  const target = wallpapers.value.find((wallpaper) => wallpaper.id === focusId)
  if (!target) {
    return
  }

  onOpenModal(target)
  router.replace({ query: { ...route.query, focus: undefined } })
}

watch([activeCategory, sortOption, density], () => {
  currentPage.value = 1
  persistFilters()
})

watch(searchKeyword, persistFilters)

watch([filteredWallpapers, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyboard)
  trackVisit(window.location.pathname).catch((error) => {
    console.error('访问统计上报失败:', error)
  })
  fetchWallpapers(searchKeyword.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboard)
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
})
</script>

<template>
  <div class="page-container home-view">
    <section class="hero-panel">
      <div class="page-copy hero-copy">
        <span class="badge">CURATED WALLPAPER LIBRARY</span>
        <h1 class="page-title">发现下一张桌面主角</h1>
        <p class="page-description">
          把搜索、收藏、最近查看和快速下载放进同一条路径里，减少来回试错。
        </p>

        <div class="hero-actions">
          <button
            type="button"
            class="hero-btn primary"
            @click="pickRandomWallpaper"
          >
            随机来一张
          </button>
          <button
            v-if="continueWallpaper"
            type="button"
            class="hero-btn"
            @click="resumeLastViewed"
          >
            继续上次浏览
          </button>
        </div>
      </div>

      <div class="hero-side">
        <div class="hero-metric card">
          <p class="metric-label">当前结果</p>
          <p class="metric-value">{{ filteredWallpapers.length }}</p>
          <p class="metric-sub">总库 {{ wallpapers.length }} 张</p>
        </div>

        <div class="hero-mini card">
          <p class="mini-title">已收藏</p>
          <strong>{{ favoriteWallpapers.length }}</strong>
          <span>最近查看 {{ recentWallpapers.length }} 张</span>
        </div>
      </div>
    </section>

    <section
      v-if="recentWallpapers.length > 0"
      class="recent-strip card"
    >
      <div class="section-head">
        <div>
          <h2 class="section-title">最近看过</h2>
          <p class="section-subtitle">回来时可以从上次停下的位置继续。</p>
        </div>
      </div>

      <div class="recent-list">
        <button
          v-for="wallpaper in recentWallpapers"
          :key="wallpaper.id"
          type="button"
          class="recent-item"
          @click="onOpenModal(wallpaper)"
        >
          <img
            :src="wallpaper.thumbnailUrl"
            :alt="wallpaper.fileName"
            loading="lazy"
          />
          <span>{{ wallpaper.fileName }}</span>
        </button>
      </div>
    </section>

    <section class="control-panel card">
      <div class="toolbar-row">
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

        <div class="toolbar-actions">
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
              :value="searchInput"
              type="text"
              placeholder="搜索文件名..."
              @input="handleSearch(($event.target as HTMLInputElement).value)"
            />
            <button
              v-if="searchInput"
              type="button"
              class="ghost-icon"
              @click="clearSearch"
            >
              清空
            </button>
          </label>

          <label class="select-field">
            <span>排序</span>
            <t-select
              :model-value="sortOption"
              size="small"
              @update:model-value="sortOption = String($event)"
            >
              <t-option value="latest" label="最新上传" />
              <t-option value="name-asc" label="名称 A-Z" />
              <t-option value="name-desc" label="名称 Z-A" />
              <t-option value="size-desc" label="大图优先" />
              <t-option value="size-asc" label="小图优先" />
            </t-select>
          </label>

          <div class="density-toggle">
            <button
              type="button"
              :class="{ active: density === 'comfortable' }"
              @click="density = 'comfortable'"
            >
              舒展
            </button>
            <button
              type="button"
              :class="{ active: density === 'compact' }"
              @click="density = 'compact'"
            >
              紧凑
            </button>
          </div>
        </div>
      </div>

      <div class="summary-row">
        <p class="filter-summary">{{ filterSummary }}</p>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="text-btn"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
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
      class="empty-block actionable"
    >
      <p>当前筛选条件下没有结果，换个关键词试试。</p>
      <button
        type="button"
        class="hero-btn primary"
        @click="resetFilters"
      >
        清空当前条件
      </button>
    </section>

    <section
      v-else
      class="wallpapers-grid"
      :class="density"
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

        <div class="card-top-actions">
          <button
            type="button"
            class="icon-chip"
            :class="{ active: favoriteSet.has(wallpaper.id) }"
            @click="toggleFavorite(wallpaper, $event)"
          >
            {{ favoriteSet.has(wallpaper.id) ? '已收藏' : '收藏' }}
          </button>
          <button
            type="button"
            class="icon-chip"
            @click="quickDownload(wallpaper, $event)"
          >
            快速下载
          </button>
        </div>

        <div class="wallpaper-overlay">
          <p
            class="wallpaper-name"
            :title="wallpaper.fileName"
          >
            <template
              v-for="(segment, index) in highlightFileName(wallpaper.fileName)"
              :key="`${wallpaper.id}-${index}`"
            >
              <mark v-if="segment.match">{{ segment.text }}</mark>
              <span v-else>{{ segment.text }}</span>
            </template>
          </p>
          <p class="wallpaper-resolution">
            {{ formatFileSize(wallpaper.fileSize) }} · 点击查看原图
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
            <span>{{ formatFileSize(currentWallpaper.fileSize) }}</span>
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
          <p class="dialog-tip">支持键盘 ← / → 切换，Esc 关闭。</p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <div class="dialog-nav">
            <t-button
              theme="default"
              :disabled="!canGoPrev"
              @click="openByIndex(currentWallpaperIndex - 1)"
            >
              上一张
            </t-button>
            <t-button
              theme="default"
              :disabled="!canGoNext"
              @click="openByIndex(currentWallpaperIndex + 1)"
            >
              下一张
            </t-button>
          </div>

          <div class="dialog-actions">
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
              @click="handleDownload()"
            >
              下载原图
            </t-button>
          </div>
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
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 14px;
  align-items: stretch;
}

.hero-copy {
  padding: clamp(18px, 2.4vw, 28px);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background:
    radial-gradient(circle at top right, rgba(20, 184, 166, 0.12), transparent 34%),
    linear-gradient(135deg, #fbfbfb 0%, #f1f5f9 100%);
}

.hero-actions {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--text-primary);
  font-weight: 600;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.hero-btn.primary {
  background: #111827;
  color: #ffffff;
  border-color: #111827;
}

.hero-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.hero-side {
  display: grid;
  gap: 14px;
}

.hero-metric,
.hero-mini {
  background: #ffffff;
  min-height: 156px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid var(--border-color);
}

.metric-label,
.mini-title {
  font-size: 13px;
  color: var(--text-secondary);
}

.metric-value {
  font-family: var(--font-display);
  font-size: clamp(34px, 5vw, 52px);
  font-weight: 600;
  line-height: 1;
}

.metric-sub,
.hero-mini span {
  color: var(--text-tertiary);
  font-size: 13px;
}

.hero-mini strong {
  margin: 6px 0;
  font-size: 34px;
  line-height: 1;
}

.recent-strip,
.control-panel,
.pagination-wrap {
  display: grid;
  gap: 14px;
}

.section-head,
.summary-row,
.toolbar-row,
.toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-subtitle {
  color: var(--text-tertiary);
  font-size: 13px;
}

.recent-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.recent-item {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: #fafafa;
  text-align: left;
}

.recent-item img {
  width: 84px;
  height: 56px;
  object-fit: cover;
  border-radius: 12px;
}

.recent-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-pills,
.density-toggle {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-pill,
.density-toggle button,
.text-btn,
.ghost-icon,
.icon-chip {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--text-secondary);
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.category-pill.is-active,
.density-toggle button.active,
.icon-chip.active {
  background: #111827;
  color: #ffffff;
  border-color: #111827;
}

.search-box {
  min-width: min(100%, 320px);
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  min-height: 42px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: #ffffff;
}

.search-box input {
  border: 0;
  background: transparent;
  outline: none;
  min-width: 0;
}

.ghost-icon,
.text-btn {
  min-height: auto;
  padding: 0;
  border: 0;
  background: transparent;
}

.select-field {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.filter-summary {
  color: var(--text-secondary);
  font-size: 14px;
}

.loading-block,
.empty-block {
  min-height: 180px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  border: 1px dashed var(--border-color);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-secondary);
}

.empty-block.actionable {
  gap: 14px;
}

.wallpapers-grid {
  display: grid;
  gap: 14px;
}

.wallpapers-grid.comfortable {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.wallpapers-grid.compact {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.wallpaper-card {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  min-height: 220px;
  background: #0f172a;
  cursor: pointer;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.14);
}

.compact .wallpaper-card {
  min-height: 180px;
}

.wallpaper-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.28s ease;
}

.wallpaper-card:hover img {
  transform: scale(1.04);
}

.card-top-actions {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  z-index: 2;
}

.icon-chip {
  min-height: 34px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #111827;
  backdrop-filter: blur(12px);
}

.wallpaper-overlay {
  position: absolute;
  inset: auto 0 0;
  padding: 18px 16px 14px;
  display: grid;
  gap: 6px;
  color: #ffffff;
  background: linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.88) 92%);
}

.wallpaper-name {
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.wallpaper-name mark {
  padding: 0 2px;
  border-radius: 4px;
  background: rgba(250, 204, 21, 0.88);
}

.wallpaper-resolution {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.82);
}

.wallpaper-category {
  position: absolute;
  right: 12px;
  bottom: 76px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  font-size: 12px;
}

.dialog-content {
  display: grid;
  gap: 18px;
}

.dialog-image {
  max-height: min(68vh, 780px);
  width: 100%;
  object-fit: contain;
  border-radius: 20px;
  background: #f8fafc;
}

.dialog-image-info {
  display: grid;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
}

.dialog-tip {
  color: var(--text-tertiary);
  font-size: 12px;
}

.dialog-footer,
.dialog-actions,
.dialog-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1024px) {
  .hero-panel,
  .recent-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .wallpapers-grid.comfortable,
  .wallpapers-grid.compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-box {
    width: 100%;
  }

  .toolbar-actions {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .wallpapers-grid.comfortable,
  .wallpapers-grid.compact {
    grid-template-columns: 1fr;
  }

  .wallpaper-category {
    bottom: 88px;
  }

  .info-row {
    flex-direction: column;
  }
}
</style>
