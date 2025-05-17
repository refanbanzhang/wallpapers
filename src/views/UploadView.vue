<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import ImageUpload from '@/components/ImageUpload.vue'

interface UploadedImage {
  original: string
  thumbnail: string
  fileName: string
  fileSize: string
  uploadTime: string
}

const uploadedImages = ref<UploadedImage[]>([])

/**
 * 处理上传成功事件
 */
const handleUploadSuccess = (data: { original: string, thumbnail: string, file: File }) => {
  const { original, thumbnail, file } = data

  // 格式化文件大小
  const formatFileSize = (size: number): string => {
    if (size < 1024) {
      return size + ' B'
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + ' KB'
    } else {
      return (size / (1024 * 1024)).toFixed(2) + ' MB'
    }
  }

  // 添加到上传列表
  uploadedImages.value.unshift({
    original,
    thumbnail,
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    uploadTime: new Date().toLocaleString()
  })

  MessagePlugin.success('上传成功')
}

/**
 * 处理上传错误事件
 */
const handleUploadError = (error: Error) => {
  console.error('上传失败:', error)
  MessagePlugin.error(`上传失败: ${error.message}`)
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">图片上传</h1>
    <p class="page-description">上传图片会自动生成缩略图，支持多种图片格式</p>

    <div class="card upload-section">
      <ImageUpload :max-file-size="10" :thumbnail-width="200" :thumbnail-height="200" :thumbnail-quality="0.7"
        @upload-success="handleUploadSuccess" @upload-error="handleUploadError" />
    </div>

    <div class="uploaded-list" v-if="uploadedImages.length > 0">
      <h2 class="section-title">已上传图片</h2>

      <div class="list-container">
        <div v-for="(image, index) in uploadedImages" :key="index" class="image-item card">
          <div class="thumbnail-container">
            <img :src="image.thumbnail" alt="缩略图" class="thumbnail" />
          </div>
          <div class="image-info">
            <div class="file-name">{{ image.fileName }}</div>
            <div class="file-meta">
              <span class="file-size">{{ image.fileSize }}</span>
              <span class="upload-time">{{ image.uploadTime }}</span>
            </div>
          </div>
          <div class="image-actions">
            <a :href="image.original" download target="_blank" class="btn btn-primary">
              下载原图
            </a>
            <a :href="image.thumbnail" download target="_blank" class="btn btn-secondary">
              下载缩略图
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="empty-state card" v-else>
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
          <path fill="currentColor"
            d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14L6 17h12l-3.86-5.14z" />
        </svg>
      </div>
      <p class="empty-text">暂无上传图片</p>
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl) 0;
  color: var(--text-tertiary);
}

.empty-icon {
  margin-bottom: var(--spacing-md);
}

.empty-text {
  font-size: 14px;
}
</style>