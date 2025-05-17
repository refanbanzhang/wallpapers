<script setup lang="ts">
import { ref } from 'vue'
import { Loading, MessagePlugin, Progress } from 'tdesign-vue-next'
import { MAX_FILE_SIZE } from '@/constants/sharedConstants'

const props = defineProps<{
  maxFileSize?: number // 最大文件大小，单位MB
  thumbnailWidth?: number // 缩略图宽度（将由后端使用）
  thumbnailHeight?: number // 缩略图高度（将由后端使用）
  thumbnailQuality?: number // 缩略图质量（将由后端使用）
  multiple?: boolean // 是否支持多文件上传
}>()

const emit = defineEmits<{
  (e: 'upload-success', file: File): void
  (e: 'upload-success-multiple', files: File[]): void
  (e: 'upload-error', error: Error): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const isDragging = ref(false)
const uploadProgress = ref(0)
const isUploading = ref(false)
const uploadTotal = ref(0)
const uploadCompleted = ref(0)

// 设置默认值
const maxFileSize = props.maxFileSize || MAX_FILE_SIZE

/**
 * 打开文件选择器
 */
const openFileSelector = () => {
  fileInput.value?.click()
}

/**
 * 处理文件的通用方法
 */
const processFile = async (
  file: File,
): Promise<{
  success: boolean
  result?: File
  error?: string
}> => {
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
 * 处理单个文件上传并更新UI
 */
const processFileAndUpdateUI = async (file: File) => {
  try {
    loading.value = true
    isUploading.value = true
    uploadProgress.value = 0
    uploadTotal.value = 1
    uploadCompleted.value = 0

    const result = await processFile(file)

    if (result.success && result.result) {
      // 更新进度
      uploadProgress.value = 100
      uploadCompleted.value = 1

      // 触发上传成功事件，让父组件处理上传到服务器
      emit('upload-success', result.result)
    } else {
      // 显示错误
      MessagePlugin.error(result.error || '文件处理失败')
      emit('upload-error', new Error(result.error || '文件处理失败'))
    }
  } catch (error) {
    console.error('处理文件失败:', error)
    emit('upload-error', error instanceof Error ? error : new Error('处理文件失败'))
    MessagePlugin.error('处理文件失败')
  } finally {
    loading.value = false
    isUploading.value = false
    resetFileInput()
  }
}

/**
 * 处理多个文件上传
 */
const processMultipleFiles = async (fileList: FileList) => {
  try {
    loading.value = true
    isUploading.value = true
    uploadProgress.value = 0

    const results: Array<File> = []
    const errors: Array<string> = []
    const totalFiles = fileList.length
    uploadTotal.value = totalFiles
    uploadCompleted.value = 0

    // 使用Promise.all进行并行处理，提高效率
    const processPromises = Array.from(fileList).map(async (file) => {
      const result = await processFile(file)

      // 更新进度
      uploadCompleted.value++
      uploadProgress.value = Math.round((uploadCompleted.value / totalFiles) * 100)

      return result
    })

    const processResults = await Promise.all(processPromises)

    // 收集结果
    processResults.forEach((result) => {
      if (result.success && result.result) {
        results.push(result.result)
      } else if (result.error) {
        errors.push(result.error)
      }
    })

    // 显示处理结果信息
    if (results.length === totalFiles) {
      MessagePlugin.success(`成功上传 ${results.length} 张图片`)
    } else if (results.length > 0) {
      MessagePlugin.warning(`成功上传 ${results.length}/${totalFiles} 张图片`)
    } else {
      MessagePlugin.error('没有成功上传的图片')
    }

    // 显示详细错误信息
    if (errors.length > 0) {
      console.error('部分文件上传失败:', errors)
    }

    // 触发事件
    if (results.length > 0) {
      // 触发多文件上传成功事件
      emit('upload-success-multiple', results)
    } else {
      emit('upload-error', new Error('没有成功上传的文件'))
    }
  } catch (error) {
    console.error('批量处理文件失败:', error)
    emit('upload-error', error instanceof Error ? error : new Error('批量处理文件失败'))
    MessagePlugin.error('批量处理文件失败')

    loading.value = false
    isUploading.value = false
    resetFileInput()
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

  if (props.multiple && files.length > 1) {
    await processMultipleFiles(files)
  } else {
    await processFileAndUpdateUI(files[0])
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

/**
 * 处理拖拽相关事件
 */
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
  isDragging.value = false
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) {
    return
  }

  if (props.multiple && files.length > 1) {
    await processMultipleFiles(files)
  } else {
    await processFileAndUpdateUI(files[0])
  }
}
</script>

<template>
  <div class="image-upload-container">
    <input type="file" ref="fileInput" accept="image/*" class="file-input" @change="handleFileChange"
      :multiple="multiple" />

    <div class="upload-area" :class="{ 'is-dragging': isDragging }" @click="openFileSelector"
      @dragenter="handleDragEnter" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
      <div v-if="loading" class="loading-container">
        <Loading size="medium" />
        <span class="loading-text">处理中...</span>
        <div v-if="isUploading" class="progress-container">
          <Progress :percentage="uploadProgress" :label="false" />
          <span class="progress-text">{{ uploadCompleted }}/{{ uploadTotal }} 已处理</span>
        </div>
      </div>

      <div v-else class="upload-placeholder">
        <div class="upload-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
            <path fill="currentColor"
              d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h-5zM5 19l3-4l2 3l3-4l4 5H5z" />
          </svg>
        </div>
        <span class="upload-text">
          {{ multiple ? '点击或拖拽上传多张图片' : '点击或拖拽上传图片' }}
        </span>
        <span class="upload-hint">缩略图将在服务器自动生成，文件大小不超过{{ maxFileSize }}MB</span>

        <div v-if="isDragging" class="drag-overlay">
          <div class="drag-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
              <path fill="currentColor"
                d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5l5 5h-3z" />
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
  border: 2px dashed var(--td-component-stroke);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  min-height: 160px;
}

.upload-area:hover {
  border-color: var(--td-brand-color);
}

.upload-area.is-dragging {
  border-color: var(--td-brand-color);
  background-color: rgba(var(--td-brand-color-rgb), 0.05);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.loading-text {
  color: var(--td-text-color-secondary);
  font-size: 14px;
}

.progress-container {
  width: 200px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.progress-text {
  color: var(--td-text-color-secondary);
  font-size: 12px;
  margin-top: 4px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  color: var(--td-brand-color);
  margin-bottom: 8px;
}

.upload-text {
  font-size: 16px;
  color: var(--td-text-color-primary);
}

.upload-hint {
  font-size: 14px;
  color: var(--td-text-color-secondary);
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
  background-color: rgba(var(--td-brand-color-rgb), 0.1);
  border-radius: 8px;
  z-index: 10;
  gap: 16px;
}

.drag-icon {
  color: var(--td-brand-color);
}

.drag-text {
  font-size: 18px;
  font-weight: 500;
  color: var(--td-brand-color);
}
</style>
