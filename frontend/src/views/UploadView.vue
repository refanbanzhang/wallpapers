<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin, Loading } from 'tdesign-vue-next'
import ImageUpload from '@/components/ImageUpload.vue'
import { formatFileSize } from '@/utils/upload'
import {
  MAX_FILE_SIZE,
  DEFAULT_THUMBNAIL_WIDTH,
  DEFAULT_THUMBNAIL_HEIGHT,
  DEFAULT_THUMBNAIL_QUALITY,
} from '@/constants/sharedConstants'
import { getImages, uploadImage } from '@/api/index'

interface ServerImage {
  id: string
  originalUrl: string
  thumbnailUrl: string
  fileName: string
  fileSize: number
  uploadTime: string
  category?: string
}

interface UploadedImage {
  id: string
  originalUrl: string
  thumbnailUrl: string
  fileName: string
  fileSize: string
  uploadTime: string
  category?: string
}

const categoryOptions = [
  { value: '', label: '不设置分类' },
  { value: 'nature', label: '自然' },
  { value: 'beauty', label: '美女' },
  { value: 'anime', label: '动漫' },
]

const uploadedImages = ref<UploadedImage[]>([])
const loading = ref(false)
const selectedCategory = ref('')

const latestImages = computed(() => uploadedImages.value.slice(0, 12))

const getCategoryLabel = (category?: string) => {
  if (!category) {
    return '未分类'
  }
  return categoryOptions.find((item) => item.value === category)?.label || '未分类'
}

const fetchUploadedImages = async () => {
  try {
    loading.value = true
    const images = (await getImages()) as ServerImage[]
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

onMounted(() => {
  fetchUploadedImages()
})
</script>

<template>
  <div class="page-container upload-view">
    <section class="upload-hero">
      <div>
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
        <h2 class="section-title">最近上传</h2>
        <span>{{ latestImages.length }} / {{ uploadedImages.length }}</span>
      </div>

      <div class="gallery-grid">
        <article
          v-for="image in latestImages"
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
          </div>
        </article>
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
  gap: 16px;
  align-items: stretch;
}

.hero-stats {
  background: linear-gradient(145deg, #22bfa0, #1c9f86);
  color: #fff;
  display: grid;
  place-content: center;
  gap: 6px;
}

.stats-label {
  font-size: 13px;
  opacity: 0.9;
}

.stats-value {
  font-family: var(--font-display);
  font-size: clamp(34px, 6vw, 54px);
  line-height: 1;
  font-weight: 700;
}

.upload-panel {
  display: grid;
  gap: 18px;
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
  border: 1px solid var(--border-color);
  background: #fff;
  color: var(--text-secondary);
  font-weight: 600;
  transition: all 0.22s ease;
}

.category-option:hover {
  border-color: var(--brand-400);
  color: var(--brand-600);
}

.category-option.active {
  border-color: transparent;
  background: linear-gradient(120deg, var(--brand-500), var(--brand-400));
  color: #fff;
  box-shadow: 0 10px 20px rgba(47, 103, 244, 0.3);
}

.loading-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
}

.gallery-panel {
  display: grid;
  gap: 14px;
}

.gallery-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}

.gallery-card {
  overflow: hidden;
  border-radius: var(--radius-sm);
  border: 1px solid var(--surface-border);
  background: #fff;
  box-shadow: var(--shadow-card);
}

.gallery-card img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.gallery-info {
  padding: 10px;
  display: grid;
  gap: 2px;
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

@media (max-width: 900px) {
  .upload-hero {
    grid-template-columns: 1fr;
  }
}
</style>
