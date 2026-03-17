<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { MessagePlugin, Loading, Pagination as TPagination } from 'tdesign-vue-next'
import ImageUpload from '@/components/ImageUpload.vue'
import { formatFileSize } from '@/utils/upload'
import {
  MAX_FILE_SIZE,
  DEFAULT_THUMBNAIL_WIDTH,
  DEFAULT_THUMBNAIL_HEIGHT,
  DEFAULT_THUMBNAIL_QUALITY,
} from '@/constants/constants'
import { getImages, uploadImage, removeImage } from '@/api/index'

interface ServerImage {
  id: string
  originalUrl: string
  thumbnailUrl: string
  fileName: string
  fileSize: number
  uploadTime: string
  category?: string | null
}

interface UploadedImage {
  id: string
  originalUrl: string
  thumbnailUrl: string
  fileName: string
  fileSize: string
  uploadTime: string
  category?: string | null
}

const categoryOptions = [
  { value: '', label: '不设置分类' },
  { value: 'nature', label: '自然' },
  { value: 'beauty', label: '美女' },
  { value: 'anime', label: '动漫' },
]

const uploadedImages = ref<UploadedImage[]>([])
const loading = ref(false)
const deletingId = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)
const pageSize = ref(12)
const pageSizeOptions = [8, 12, 16, 24]

const latestImages = computed(() => uploadedImages.value)
const totalPages = computed(() => Math.max(1, Math.ceil(latestImages.value.length / pageSize.value)))
const pagedImages = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  return latestImages.value.slice(startIndex, startIndex + pageSize.value)
})

const getCategoryLabel = (category?: string | null) => {
  if (!category) {
    return '未分类'
  }
  return categoryOptions.find((item) => item.value === category)?.label || '未分类'
}

const fetchUploadedImages = async () => {
  try {
    loading.value = true
    const images: ServerImage[] = await getImages()
    uploadedImages.value = images.map((image) => ({
      ...image,
      fileSize: formatFileSize(image.fileSize),
    }))
  } catch (error) {
    console.error('获取图片列表失败:', error)
    MessagePlugin.error('获取图片列表失败')
  } finally {
    loading.value = false
  }
}

const handleUploadSuccess = async (files: File[]) => {
  try {
    loading.value = true

    const uploadPromises = files.map((file) => uploadImage(file, selectedCategory.value))
    await Promise.all(uploadPromises)
    await fetchUploadedImages()

    MessagePlugin.success(
      `成功上传 ${files.length} 张图片${selectedCategory.value ? `，分类：${getCategoryLabel(selectedCategory.value)}` : ''}`,
    )
  } catch (error) {
    console.error('批量上传失败:', error)
    MessagePlugin.error(`批量上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

const refreshImages = async () => {
  await fetchUploadedImages()
}

const handleCurrentChange = (nextPage: number) => {
  currentPage.value = nextPage
}

const handlePageSizeChange = (nextPageSize: number) => {
  pageSize.value = nextPageSize
  currentPage.value = 1
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

onMounted(() => {
  fetchUploadedImages()
})

watch([latestImages, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
  }
})
</script>

<template>
  <div class="page-container upload-view">
    <section class="upload-hero">
      <div class="page-copy">
        <span class="badge">UPLOAD WORKFLOW</span>
        <h1 class="page-title">上传并整理你的壁纸素材</h1>
        <p class="page-description">
          拖拽即可批量上传，自动生成缩略图。你可以在上传前先选择分类，后续浏览时更快定位。
        </p>
      </div>
      <div class="hero-stats card">
        <p class="stats-label">已收录图片</p>
        <p class="stats-value">{{ uploadedImages.length }}</p>
      </div>
    </section>

    <section class="card upload-panel">
      <div class="panel-head">
        <h2 class="section-title">上传中心</h2>
        <p>建议图片宽度不低于 1920px，以保证桌面显示效果。</p>
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

    <section
      v-if="loading"
      class="loading-block"
    >
      <div class="loading-inner">
        <Loading size="medium" />
        <span>处理中...</span>
      </div>
    </section>

    <section
      v-else-if="latestImages.length === 0"
      class="empty-block"
    >
      暂无上传记录，先来上传第一张壁纸。
    </section>

    <section
      v-else
      class="card gallery-panel"
    >
      <div class="gallery-head">
        <h2 class="section-title">图片管理</h2>
        <div class="gallery-tools">
          <span>{{ latestImages.length }} / {{ uploadedImages.length }}</span>
          <button
            type="button"
            class="tool-btn"
            :disabled="loading"
            @click="refreshImages"
          >
            刷新
          </button>
        </div>
      </div>

      <div class="gallery-grid">
        <article
          v-for="image in pagedImages"
          :key="image.id"
          class="gallery-card"
        >
          <img
            :src="image.thumbnailUrl"
            :alt="image.fileName"
            loading="lazy"
          />
          <div class="gallery-info">
            <p class="filename" :title="image.fileName">{{ image.fileName }}</p>
            <p>{{ image.fileSize }}</p>
            <p>{{ getCategoryLabel(image.category) }}</p>
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

      <div
        v-if="latestImages.length > pageSize"
        class="gallery-pagination"
      >
        <t-pagination
          :current="currentPage"
          :page-size="pageSize"
          :total="latestImages.length"
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

.upload-panel {
  display: grid;
  gap: 20px;
}

.panel-head p {
  color: var(--text-secondary);
}

.category-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-option {
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

.category-option:hover {
  color: #1f1f1f;
  transform: translateY(-1px);
  border-color: #bcbcbc;
  background: #f7f7f7;
}

.category-option.active {
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

.gallery-panel {
  display: grid;
  gap: 16px;
}

.gallery-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
}

.gallery-tools {
  display: inline-flex;
  align-items: center;
  gap: 10px;
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

@media (max-width: 900px) {
  .upload-hero {
    grid-template-columns: 1fr;
  }
}
</style>
