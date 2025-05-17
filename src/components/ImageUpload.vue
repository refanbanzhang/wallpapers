<script setup lang="ts">
import { ref } from 'vue'
import { generateThumbnail } from '@/utils/image'
import { Loading, MessagePlugin } from 'tdesign-vue-next'

const props = defineProps<{
  maxFileSize?: number; // 最大文件大小，单位MB
  thumbnailWidth?: number; // 缩略图宽度
  thumbnailHeight?: number; // 缩略图高度
  thumbnailQuality?: number; // 缩略图质量
}>()

const emit = defineEmits<{
  (e: 'upload-success', data: { original: string, thumbnail: string, file: File }): void
  (e: 'upload-error', error: Error): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const previewUrl = ref<string>('')

// 设置默认值
const maxFileSize = props.maxFileSize || 10 // 默认5MB
const thumbnailWidth = props.thumbnailWidth || 200
const thumbnailHeight = props.thumbnailHeight || 200
const thumbnailQuality = props.thumbnailQuality || 0.7

/**
 * 打开文件选择器
 */
const openFileSelector = () => {
  fileInput.value?.click()
}

/**
 * 处理文件选择
 */
const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files

  if (!files || files.length === 0) {
    return
  }

  const file = files[0]

  // 检查文件大小
  if (file.size > maxFileSize * 1024 * 1024) {
    MessagePlugin.error(`文件大小不能超过${maxFileSize}MB`)
    resetFileInput()
    return
  }

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    MessagePlugin.error('请选择图片文件')
    resetFileInput()
    return
  }

  try {
    loading.value = true

    // 生成缩略图
    const { original, thumbnail } = await generateThumbnail(
      file,
      thumbnailWidth,
      thumbnailHeight,
      thumbnailQuality
    )

    // 显示预览
    previewUrl.value = thumbnail

    // 触发上传成功事件
    emit('upload-success', { original, thumbnail, file })
  } catch (error) {
    console.error('生成缩略图失败:', error)
    emit('upload-error', error instanceof Error ? error : new Error('生成缩略图失败'))
    MessagePlugin.error('生成缩略图失败')
  } finally {
    loading.value = false
    resetFileInput()
  }
}

/**
 * 重置文件输入框
 */
const resetFileInput = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="image-upload-container">
    <input type="file" ref="fileInput" accept="image/*" class="file-input" @change="handleFileChange" />

    <div class="upload-area" @click="openFileSelector">
      <div v-if="loading" class="loading-container">
        <Loading size="medium" />
        <span class="loading-text">处理中...</span>
      </div>

      <div v-else-if="previewUrl" class="preview-container">
        <img :src="previewUrl" alt="预览" class="preview-image" />
        <div class="preview-overlay">
          <span>点击重新上传</span>
        </div>
      </div>

      <div v-else class="upload-placeholder">
        <div class="upload-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
            <path fill="currentColor"
              d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h-5zM5 19l3-4l2 3l3-4l4 5H5z" />
          </svg>
        </div>
        <span class="upload-text">点击上传图片</span>
        <span class="upload-hint">自动生成缩略图，文件大小不超过{{ maxFileSize }}MB</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-upload-container {
  width: 100%;
}

.file-input {
  display: none;
}

.upload-area {
  width: 100%;
  height: 200px;
  border: 2px dashed var(--border-color);
  border-radius: var(--border-radius);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: var(--primary-color);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--text-secondary);
}

.upload-icon {
  margin-bottom: var(--spacing-sm);
  color: var(--primary-color);
}

.upload-text {
  font-size: 16px;
  margin-bottom: var(--spacing-xs);
}

.upload-hint {
  font-size: 12px;
  color: var(--text-tertiary);
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

.preview-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  font-size: 14px;
}

.preview-container:hover .preview-overlay {
  opacity: 1;
}
</style>