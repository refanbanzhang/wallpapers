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
  <div class="upload-container">
    <h1 class="page-title">图片上传</h1>
    <p class="page-description">上传图片会自动生成缩略图，支持多种图片格式</p>

    <div class="upload-section">
      <ImageUpload :max-file-size="10" :thumbnail-width="200" :thumbnail-height="200" :thumbnail-quality="0.7"
        @upload-success="handleUploadSuccess" @upload-error="handleUploadError" />
    </div>

    <div class="uploaded-list" v-if="uploadedImages.length > 0">
      <h2 class="section-title">已上传图片</h2>

      <div class="list-container">
        <div v-for="(image, index) in uploadedImages" :key="index" class="image-item">
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
            <a :href="image.original" download target="_blank" class="action-button">
              下载原图
            </a>
            <a :href="image.thumbnail" download target="_blank" class="action-button">
              下载缩略图
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
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
.upload-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 24px;
  margin-bottom: 8px;
  color: #333;
}

.page-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}

.upload-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  margin-bottom: 16px;
  color: #333;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background-color: #f5f5f5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.thumbnail-container {
  width: 60px;
  height: 60px;
  overflow: hidden;
  border-radius: 4px;
  margin-right: 12px;
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
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.file-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.image-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  background-color: #0052d9;
  color: white;
  text-decoration: none;
  transition: background-color 0.3s;
}

.action-button:hover {
  background-color: #003eb3;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  color: #ccc;
}

.empty-icon {
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
}
</style>