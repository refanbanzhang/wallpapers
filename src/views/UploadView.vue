<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import ImageUpload from '@/components/ImageUpload.vue'
import { uploadImages, getUploadedImages, deleteImage, formatFileSize } from '@/utils/upload'
import { MAX_FILE_SIZE, DEFAULT_THUMBNAIL_WIDTH, DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_QUALITY } from '@/constants/sharedConstants'

interface ServerImage {
  id: string
  originalUrl: string
  thumbnailUrl: string
  fileName: string
  fileSize: number
  uploadTime: string
}

interface UploadedImage {
  id: string
  originalUrl: string
  thumbnailUrl: string
  fileName: string
  fileSize: string
  uploadTime: string
}

// 已上传图片列表
const uploadedImages = ref<UploadedImage[]>([])
const loading = ref(false)

// 获取已上传图片列表
const fetchUploadedImages = async () => {
  try {
    loading.value = true
    const images = (await getUploadedImages()) as ServerImage[]
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

// 组件挂载时获取图片列表
onMounted(() => {
  fetchUploadedImages()
})

/**
 * 处理上传成功事件
 */
const handleUploadSuccess = async (data: { original: string; thumbnail: string; file: File }) => {
  const { original, thumbnail, file } = data

  try {
    loading.value = true

    // 上传到服务器
    await uploadImages(original, thumbnail, file.name)

    // 获取最新的图片列表
    await fetchUploadedImages()

    MessagePlugin.success('上传成功')
  } catch (error) {
    console.error('上传失败:', error)
    MessagePlugin.error(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

/**
 * 处理批量上传成功事件
 */
const handleUploadSuccessMultiple = async (dataArray: Array<{ original: string; thumbnail: string; file: File }>) => {
  try {
    loading.value = true

    // 批量上传到服务器
    const uploadPromises = dataArray.map(({ original, thumbnail, file }) =>
      uploadImages(original, thumbnail, file.name)
    )

    await Promise.all(uploadPromises)

    // 获取最新的图片列表
    await fetchUploadedImages()

    MessagePlugin.success(`成功上传 ${dataArray.length} 张图片`)
  } catch (error) {
    console.error('批量上传失败:', error)
    MessagePlugin.error(`批量上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

/**
 * 处理上传错误事件
 */
const handleUploadError = (error: Error) => {
  console.error('上传失败:', error)
  MessagePlugin.error(`上传失败: ${error.message}`)
}

/**
 * 删除图片
 */
const handleDeleteImage = (id: string) => {
  DialogPlugin.confirm({
    header: '确认删除',
    body: '确定要删除这张图片吗？此操作不可恢复。',
    confirmBtn: {
      content: '删除',
      theme: 'danger',
    },
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await deleteImage(id)
        await fetchUploadedImages()
        MessagePlugin.success('删除成功')
      } catch {
        MessagePlugin.error('删除失败')
      }
    },
  })
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">图片上传</h1>
    <p class="page-description">上传图片会自动生成缩略图，支持多种图片格式</p>

    <div class="card upload-section">
      <ImageUpload multiple :max-file-size="MAX_FILE_SIZE" :thumbnail-width="DEFAULT_THUMBNAIL_WIDTH"
        :thumbnail-height="DEFAULT_THUMBNAIL_HEIGHT" :thumbnail-quality="DEFAULT_THUMBNAIL_QUALITY"
        @upload-success="handleUploadSuccess" @upload-success-multiple="handleUploadSuccessMultiple"
        @upload-error="handleUploadError" />
    </div>

    <div v-if="loading" class="loading-section">
      <div class="loading-container">
        <Loading size="medium" />
        <span class="loading-text">加载中...</span>
      </div>
    </div>

    <div class="uploaded-list" v-else-if="uploadedImages.length > 0">
      <h2 class="section-title">已上传图片</h2>

      <div class="list-container">
        <div v-for="image in uploadedImages" :key="image.id" class="image-item card">
          <div class="thumbnail-container">
            <img :src="image.thumbnailUrl" alt="缩略图" class="thumbnail" />
          </div>
          <div class="image-info">
            <div class="file-name">{{ image.fileName }}</div>
            <div class="file-meta">
              <span class="file-size">{{ image.fileSize }}</span>
              <span class="upload-time">{{ image.uploadTime }}</span>
            </div>
          </div>
          <div class="image-actions">
            <a :href="image.originalUrl" :download="image.fileName" class="btn btn-primary">
              下载原图
            </a>
            <a :href="image.thumbnailUrl" :download="`缩略图_${image.fileName}`" class="btn btn-secondary">
              下载缩略图
            </a>
            <button class="btn btn-danger" @click="handleDeleteImage(image.id)">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
}

.upload-section {
  margin-bottom: var(--spacing-xl);
}

.loading-section {
  display: flex;
  justify-content: center;
  margin: var(--spacing-xl) 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-text {
  margin-top: var(--spacing-sm);
  font-size: 14px;
  color: var(--text-secondary);
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.image-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
}

.thumbnail-container {
  width: 60px;
  height: 60px;
  overflow: hidden;
  border-radius: 4px;
  margin-right: var(--spacing-md);
  flex-shrink: 0;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-info {
  flex-grow: 1;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.file-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: var(--spacing-xs);
}

.image-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.btn {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-secondary {
  background-color: var(--info-color, #0052d9);
  color: white;
}

.btn-danger {
  background-color: var(--danger-color, #e34d59);
  color: white;
  border: none;
}
</style>
