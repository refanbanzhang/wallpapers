<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MessagePlugin, Loading } from 'tdesign-vue-next'
import ImageUpload from '@/components/ImageUpload.vue'
import { formatFileSize } from '@/utils/upload'
import { MAX_FILE_SIZE, DEFAULT_THUMBNAIL_WIDTH, DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_QUALITY } from '@/constants/sharedConstants'
import { getImages, uploadImage } from '@/api/index'

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
const selectedCategory = ref('')

// 获取已上传图片列表
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

/**
 * 处理批量上传成功事件
 */
const handleUploadSuccess = async (files: File[]) => {
  try {
    loading.value = true

    // 批量上传到服务器（传递分类信息）
    const uploadPromises = files.map(file =>
      uploadImage(file, selectedCategory.value)
    )

    await Promise.all(uploadPromises)

    // 获取最新的图片列表
    await fetchUploadedImages()

    MessagePlugin.success(`成功上传 ${files.length} 张图片${selectedCategory.value ? '，分类：' + selectedCategory.value : ''}`)
  } catch (error) {
    console.error('批量上传失败:', error)
    MessagePlugin.error(`批量上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

// 组件挂载时获取图片列表
onMounted(() => {
  fetchUploadedImages()
})
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">图片上传</h1>
    <p class="page-description">上传图片会自动生成缩略图，支持多种图片格式</p>

    <div class="card upload-section">
      <ImageUpload
        multiple
        :max-file-size="MAX_FILE_SIZE"
        :thumbnail-width="DEFAULT_THUMBNAIL_WIDTH"
        :thumbnail-height="DEFAULT_THUMBNAIL_HEIGHT"
        :thumbnail-quality="DEFAULT_THUMBNAIL_QUALITY"
        @upload-success="handleUploadSuccess"
      />
    </div>

    <div
      v-if="loading"
      class="loading-section"
    >
      <div class="loading-container">
        <Loading size="medium" />
        <span class="loading-text">加载中...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
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

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }
}
</style>
