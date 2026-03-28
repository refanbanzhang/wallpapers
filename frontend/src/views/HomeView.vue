<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Dialog as TDialog,
  Button as TButton,
  Loading as TLoading,
  Pagination as TPagination,
  MessagePlugin,
} from 'tdesign-vue-next'

import { getImages, trackVisit } from '@/api/index'
import { readStorage, readStorageString, writeStorage, writeStorageString } from '@/utils/storage'

interface Wallpaper {
  id: string
  fileName: string
  originalUrl: string
  thumbnailUrl: string
  uploadTime: string
  fileSize: number
  category?: string | null
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
const HOME_RECENTS_KEY = 'wallpaper_home_recents'
const HOME_LAST_VIEWED_KEY = 'wallpaper_home_last_viewed'

const wallpapers = ref<Wallpaper[]>([])
const dialogVisible = ref(false)
const currentWallpaper = ref<Wallpaper | null>(null)
const isLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10]

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

const recentIds = ref<string[]>(readStorage(HOME_RECENTS_KEY, []))
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
  dialogVisible.value = true
  rememberRecent(wallpaper.id)
}

const onCloseDialog = () => {
  dialogVisible.value = false
  currentWallpaper.value = null
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
  <div class="home-view">
    <Teleport to="#site-header-extra">
      <div class="category-pills category-pills-header">
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
    </Teleport>

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
      </article>
    </section>

    <section
      v-if="filteredWallpapers.length > pageSize"
      class="pagination-wrap"
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
      header="壁纸预览"
      attach="body"
      class="wallpaper-dialog"
      width="min(92vw, 1440px)"
      top="3vh"
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
      </div>

      <template #footer>
        <div class="dialog-footer">
          <div class="dialog-meta">
            <span class="dialog-kicker">Preview</span>
            <p class="dialog-hint">Esc 关闭 · ← → 切换</p>
          </div>

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
  min-height: 34px;
  padding: 0 12px;
  border-radius: 3px;
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--text-primary);
  font-size: 13px;
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
  border-radius: 3px;
  border: 1px solid var(--border-color);
  background: #fafafa;
  text-align: left;
}

.recent-item img {
  width: 84px;
  height: 56px;
  object-fit: cover;
  border-radius: 3px;
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

.category-pills-header {
  justify-content: flex-end;
}

.category-pill,
.density-toggle button,
.text-btn,
.ghost-icon {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 3px;
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--text-secondary);
  font-size: 13px;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.category-pill.is-active,
.density-toggle button.active {
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
  padding: 0 10px;
  min-height: 36px;
  border-radius: 3px;
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
  gap: 12px;
}

.wallpapers-grid.comfortable {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.wallpapers-grid.compact {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

@media (max-width: 1440px) {
  .wallpapers-grid.comfortable,
  .wallpapers-grid.compact {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.wallpaper-card {
  position: relative;
  overflow: hidden;
  border-radius: 3px;
  aspect-ratio: 16 / 9;
  background: #0f172a;
  cursor: pointer;
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.1),
    0 20px 40px rgba(15, 23, 42, 0.16);
}

.compact .wallpaper-card {
  aspect-ratio: 16 / 9;
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

.dialog-content {
  display: grid;
  place-items: center;
  min-height: min(79vh, 920px);
  padding: 22px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 26%),
    radial-gradient(circle at bottom, rgba(255, 255, 255, 0.04), transparent 28%),
    linear-gradient(180deg, rgba(24, 24, 28, 0.98) 0%, rgba(11, 11, 13, 0.98) 100%);
}

.dialog-image {
  max-height: min(72vh, 860px);
  max-width: 100%;
  width: auto;
  object-fit: contain;
  border-radius: 3px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 70px rgba(0, 0, 0, 0.38);
}

.dialog-footer,
.dialog-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.dialog-meta {
  display: grid;
  gap: 2px;
}

.dialog-kicker {
  color: rgba(255, 255, 255, 0.92);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.dialog-hint {
  color: rgba(255, 255, 255, 0.56);
  font-size: 12px;
  letter-spacing: 0.02em;
}

.wallpaper-dialog:deep(.t-dialog) {
  overflow: hidden;
  border: 0 !important;
  background: rgba(12, 12, 14, 0.9) !important;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.16),
    0 40px 120px rgba(0, 0, 0, 0.42) !important;
  backdrop-filter: blur(18px);
}

.wallpaper-dialog:deep(.t-dialog__header) {
  padding: 14px 20px 10px !important;
  color: rgba(255, 255, 255, 0.74) !important;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.wallpaper-dialog:deep(.t-dialog__body) {
  padding: 0 !important;
  background: rgba(12, 12, 14, 0.96) !important;
}

.wallpaper-dialog:deep(.t-dialog__footer) {
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
  padding: 12px 18px 14px !important;
  background: linear-gradient(180deg, rgba(18, 18, 20, 0.96), rgba(12, 12, 14, 0.98)) !important;
}

.wallpaper-dialog:deep(.t-dialog__close) {
  color: rgba(255, 255, 255, 0.58) !important;
}

.wallpaper-dialog:deep(.t-dialog__close:hover) {
  color: rgba(255, 255, 255, 0.96) !important;
}

.wallpaper-dialog:deep(.t-button--variant-base.t-button--theme-default) {
  min-width: 84px;
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.88);
}

.wallpaper-dialog:deep(.t-button--variant-base.t-button--theme-default:hover) {
  border-color: rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.12);
}

.wallpaper-dialog:deep(.t-button.is-disabled),
.wallpaper-dialog:deep(.t-button--disabled) {
  opacity: 0.34;
}

.wallpaper-dialog:deep(.t-overlay) {
  backdrop-filter: blur(6px);
}

@media (max-width: 1024px) {
  .hero-panel,
  .recent-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .category-pills-header {
    width: 100%;
    justify-content: flex-start;
  }

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

  .dialog-footer {
    justify-content: center;
  }

  .dialog-meta {
    width: 100%;
    justify-items: center;
  }

  .dialog-hint {
    width: 100%;
    text-align: center;
  }
}
</style>
