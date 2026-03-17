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

const latestImages = computed(() => uploadedImages.value)

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
    </section>
  </div>
</template>

<style scoped>
.upload-view {
  display: grid;
  gap: 22px;
}

.upload-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 18px;
  align-items: stretch;
}

.hero-stats {
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.84), rgba(206, 245, 233, 0.52)),
    radial-gradient(circle at 80% 12%, rgba(94, 223, 192, 0.38), transparent 50%);
  color: #1b4a56;
  display: grid;
  place-content: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.78);
}

.stats-label {
  font-size: 13px;
  opacity: 0.8;
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
  border: 1px solid rgba(255, 255, 255, 0.56);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.76), rgba(234, 247, 255, 0.52));
  color: var(--text-secondary);
  font-weight: 600;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    color 0.22s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
}

.category-option:hover {
  color: #1e4f93;
  transform: translateY(-1px);
  box-shadow:
    0 9px 18px rgba(84, 123, 186, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.category-option.active {
  border-color: rgba(255, 255, 255, 0.76);
  background: linear-gradient(136deg, rgba(255, 255, 255, 0.85), rgba(178, 214, 255, 0.72));
  color: #123455;
  box-shadow:
    0 10px 22px rgba(79, 123, 188, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
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
  border: 1px solid rgba(137, 168, 214, 0.5);
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 16px;
}

.gallery-card {
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.74), rgba(224, 242, 255, 0.52));
  box-shadow: 0 12px 24px rgba(45, 78, 126, 0.16);
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease;
}

.gallery-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 30px rgba(45, 78, 126, 0.24);
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
  border: 1px solid rgba(228, 112, 105, 0.45);
  background: rgba(255, 240, 239, 0.76);
  color: #b03f38;
  font-size: 12px;
  font-weight: 700;
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
