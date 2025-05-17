<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import ImageUpload from '@/components/ImageUpload.vue'
import { uploadImage, getUploadedImages, deleteImage, formatFileSize } from '@/utils/upload'
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
// 是否只进行质量压缩，不生成缩略图（不改变图片尺寸）
const compressOnlyQuality = ref(true)

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
const handleUploadSuccess = async (file: File) => {
  try {
    loading.value = true

    // 上传到服务器，传递缩略图相关参数
    await uploadImage({
      file,
      generateThumbnail: !compressOnlyQuality.value // 根据选项决定是否生成缩略图
    })

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
const handleUploadSuccessMultiple = async (files: File[]) => {
  try {
    loading.value = true

    // 批量上传到服务器
    const uploadPromises = files.map(file =>
      uploadImage({
        file,
        generateThumbnail: !compressOnlyQuality.value // 根据选项决定是否生成缩略图
      })
    )

    await Promise.all(uploadPromises)

    // 获取最新的图片列表
    await fetchUploadedImages()

    MessagePlugin.success(`成功上传 ${files.length} 张图片`)
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

    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
          <path fill="currentColor"
            d="M5 21q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.588 1.413T19 21H5Zm0-2h14V5H5v14Zm0 0V5v14Zm7-7q1.25 0 2.125-.875T15 9q0-1.25-.875-2.125T12 6q-1.25 0-2.125.875T9 9q0 1.25.875 2.125T12 12Zm-6 6h12v-2q0-.825-.425-1.213T16 14.275q-1 .85-2.288 1.288T11.975 16q-1.45 0-2.75-.438T7 14.275q-.55.125-1 .5T5.025 16L5 18h1Z" />
        </svg>
      </div>
      <div class="empty-text">暂无上传图片</div>
      <div class="empty-action">
        通过上方上传区域添加图片
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-title {
  font-size: 28px;
  margin-bottom: 8px;
  color: var(--td-text-color-primary);
}

.page-description {
  font-size: 16px;
  color: var(--td-text-color-secondary);
  margin-bottom: 24px;
}

.card {
  background-color: var(--td-bg-color-container);
  border-radius: 8px;
  box-shadow: var(--td-shadow-1);
  padding: 24px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  margin-bottom: 16px;
  color: var(--td-text-color-primary);
}

.loading-section {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-text {
  color: var(--td-text-color-secondary);
  font-size: 14px;
}

.list-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.image-item {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  transition: transform 0.2s ease;
}

.image-item:hover {
  transform: translateY(-2px);
}

.thumbnail-container {
  height: 200px;
  overflow: hidden;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-item:hover .thumbnail {
  transform: scale(1.05);
}

.image-info {
  padding: 16px;
  flex-grow: 1;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--td-text-color-primary);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  justify-content: space-between;
  color: var(--td-text-color-secondary);
  font-size: 14px;
}

.image-actions {
  padding: 16px;
  display: flex;
  gap: 8px;
  border-top: 1px solid var(--td-component-stroke);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.btn-primary {
  background-color: var(--td-brand-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--td-brand-color-hover);
}

.btn-secondary {
  background-color: var(--td-brand-color-light);
  color: var(--td-brand-color);
}

.btn-secondary:hover {
  background-color: var(--td-brand-color-focus);
}

.btn-danger {
  background-color: var(--td-error-color-1);
  color: var(--td-error-color);
}

.btn-danger:hover {
  background-color: var(--td-error-color-2);
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  color: var(--td-text-color-secondary);
}

.empty-icon {
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-action {
  font-size: 14px;
}

@media (max-width: 768px) {
  .list-container {
    grid-template-columns: 1fr;
  }

  .page-container {
    padding: 16px;
  }
}
</style>
