<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { MAX_FILE_SIZE } from '@/constants/constants'

const props = defineProps<{
  maxFileSize?: number
  thumbnailWidth?: number
  thumbnailHeight?: number
  thumbnailQuality?: number
  multiple?: boolean
}>()

const emit = defineEmits(['upload-success'])

const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const isDragging = ref(false)
const suppressNextClick = ref(false)
let suppressClickTimer: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  if (suppressClickTimer) {
    clearTimeout(suppressClickTimer)
  }
})

// 设置默认值
const maxFileSize = props.maxFileSize || MAX_FILE_SIZE

/**
 * 打开文件选择器
 */
const openFileSelector = (event?: MouseEvent) => {
  if (suppressNextClick.value) {
    event?.preventDefault()
    event?.stopPropagation()
    suppressNextClick.value = false
    return
  }

  fileInput.value?.click()
}

/**
 * 校验文件对象
 */
const validateFile = (file: File): {
  success: boolean
  result?: File
  error?: string
} => {
  // 检查文件大小
  if (file.size > maxFileSize * 1024 * 1024) {
    return {
      success: false,
      error: `文件 ${file.name} 大小超过${maxFileSize}MB`,
    }
  }

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    return {
      success: false,
      error: `文件 ${file.name} 不是图片文件`,
    }
  }

  // 直接返回原始文件，不再生成缩略图
  return {
    success: true,
    result: file,
  }
}

/**
 * 遍历校验文件对象
 */
const validateFilesWrap = async (fileList: FileList) => {
  try {
    loading.value = true

    const results: Array<File> = []
    const errors: Array<string> = []

    const processResults = Array.from(fileList).map((file) => {
      return validateFile(file)
    })

    processResults.forEach((result) => {
      if (result.success && result.result) {
        results.push(result.result)
      } else if (result.error) {
        errors.push(result.error)
      }
    })

    // 显示详细错误信息
    if (errors.length > 0) {
      console.error('部分文件校验失败:', errors)
      MessagePlugin.error('部分文件校验失败')
      return
    }

    // 触发事件
    if (results.length > 0) {
      emit('upload-success', results)
    }
  } catch (error) {
    console.error('批量处理文件失败:', error)
    MessagePlugin.error('批量处理文件失败')
    resetFileInput()
  } finally {
    loading.value = false
  }
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

  await validateFilesWrap(files)
}

/**
 * 重置文件输入框
 */
const resetFileInput = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()

  const currentTarget = e.currentTarget as HTMLElement | null
  const relatedTarget = e.relatedTarget as Node | null

  if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
    return
  }

  if (currentTarget) {
    const rect = currentTarget.getBoundingClientRect()
    const stillInDropzone =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom

    if (stillInDropzone) {
      return
    }
  }

  isDragging.value = false
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false
  suppressNextClick.value = true

  if (suppressClickTimer) {
    clearTimeout(suppressClickTimer)
  }
  suppressClickTimer = setTimeout(() => {
    suppressNextClick.value = false
  }, 250)

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) {
    return
  }

  await validateFilesWrap(files)
}
</script>

<template>
  <div class="image-upload-container">
    <input
      type="file"
      ref="fileInput"
      accept="image/*"
      class="file-input"
      @change="handleFileChange"
      :multiple="multiple"
    />

    <div
      class="upload-area"
      :class="{ 'is-dragging': isDragging }"
      @click="openFileSelector"
      @dragenter="handleDragEnter"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div
        v-if="loading"
        class="loading-container"
      >
        <span class="loading-spinner" />
        <span class="loading-text">正在处理图片...</span>
      </div>
      <div
        v-else
        class="upload-placeholder"
      >
        <div class="upload-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h-5zM5 19l3-4l2 3l3-4l4 5H5z"
            />
          </svg>
        </div>
        <span class="upload-text">
          {{ multiple ? '点击或拖拽上传多张图片' : '点击或拖拽上传图片' }}
        </span>
        <span class="upload-hint">缩略图将在服务器自动生成，文件大小不超过{{ maxFileSize }}MB</span>

        <div
          v-if="isDragging"
          class="drag-overlay"
        >
          <div class="drag-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5l5 5h-3z"
              />
            </svg>
          </div>
          <span class="drag-text">释放鼠标上传文件</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-upload-container {
  width: 100%;
  position: relative;
}

.file-input {
  display: none;
}

.upload-area {
  width: 100%;
  border: 2px dashed #d1d1d1;
  border-radius: var(--radius-md);
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease,
    border-color 0.24s ease,
    background-color 0.24s ease;
  position: relative;
  min-height: 210px;
  background: #fafafa;
  box-shadow: 0 3px 10px rgba(17, 17, 17, 0.06);
}

.upload-area:hover {
  border-color: #b8b8b8;
  box-shadow: 0 8px 20px rgba(17, 17, 17, 0.1);
  transform: translateY(-2px);
}

.upload-area.is-dragging {
  border-color: #8c8c8c;
  background-color: #f4f4f4;
  transform: scale(1.01) translateY(-1px);
}

.loading-container {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 2px solid rgba(60, 60, 60, 0.2);
  border-top-color: #222222;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 14px;
  font-weight: 600;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.upload-icon {
  color: #444444;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.upload-hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.84);
  border-radius: var(--radius-sm);
  z-index: 10;
  gap: 16px;
  border: 1px solid #d4d4d4;
}

.drag-icon {
  color: #444444;
}

.drag-text {
  font-size: 18px;
  font-weight: 700;
  color: #1f1f1f;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
