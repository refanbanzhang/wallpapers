<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { MessagePlugin, DialogPlugin, Loading, Select as TSelect, Option as TOption } from 'tdesign-vue-next'
import ImageUpload from '@/components/ImageUpload.vue'
import { formatFileSize, deleteMultipleImages } from '@/utils/upload'
import { downloadImage } from '@/utils/download'
import { MAX_FILE_SIZE, DEFAULT_THUMBNAIL_WIDTH, DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_QUALITY } from '@/constants/sharedConstants'
import { getImages, uploadImage, removeImage } from '@/api/index'

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

// 选中的图片IDs
const selectedImageIds = ref<string[]>([])

// 是否处于选择模式
const isSelectionMode = ref(false)

// 分类选择
const selectedCategory = ref('')

// 分类列表
const categoryOptions = [
  { value: '', label: '无分类' },
  { value: 'nature', label: '自然' },
  { value: 'beauty', label: '美女' },
  { value: 'anime', label: '动漫' },
  { value: 'abstract', label: '抽象' },
  { value: 'other', label: '其他' }
]

// 是否全选
const isAllSelected = computed(() => {
  return uploadedImages.value.length > 0 && selectedImageIds.value.length === uploadedImages.value.length
})

// 切换选择模式
const toggleSelectionMode = () => {
  isSelectionMode.value = !isSelectionMode.value
  // 退出选择模式时清空选择
  if (!isSelectionMode.value) {
    selectedImageIds.value = []
  }
}

// 选择或取消选择图片
const toggleSelection = (id: string) => {
  const index = selectedImageIds.value.indexOf(id)
  if (index === -1) {
    selectedImageIds.value.push(id)
  } else {
    selectedImageIds.value.splice(index, 1)
  }
}

// 全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedImageIds.value = []
  } else {
    selectedImageIds.value = uploadedImages.value.map(image => image.id)
  }
}

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

// 组件挂载时获取图片列表
onMounted(() => {
  fetchUploadedImages()
})

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

/**
 * 删除图片
 */
const handleDeleteImage = (id: string) => {
  const dialog = DialogPlugin.confirm({
    header: '确认删除',
    body: '确定要删除这张图片吗？此操作不可恢复。',
    confirmBtn: {
      content: '删除',
      theme: 'danger',
    },
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        await removeImage(id)
        await fetchUploadedImages()
        MessagePlugin.success('删除成功')
      } catch {
        MessagePlugin.error('删除失败')
      } finally {
        // 确保对话框关闭
        dialog.hide()
      }
    },
  })
}

// 批量删除图片
const handleBatchDelete = () => {
  if (selectedImageIds.value.length === 0) {
    MessagePlugin.warning('请先选择要删除的图片')
    return
  }

  const dialog = DialogPlugin.confirm({
    header: '确认批量删除',
    body: `确定要删除选中的 ${selectedImageIds.value.length} 张图片吗？此操作不可恢复。`,
    confirmBtn: {
      content: '删除',
      theme: 'danger',
    },
    cancelBtn: '取消',
    onConfirm: async () => {
      try {
        loading.value = true
        await deleteMultipleImages(selectedImageIds.value)
        await fetchUploadedImages()
        selectedImageIds.value = []
        isSelectionMode.value = false
        MessagePlugin.success('批量删除成功')
      } catch {
        MessagePlugin.error('批量删除失败')
      } finally {
        loading.value = false
        dialog.hide()
      }
    },
  })
}

// 下载原图
const handleDownloadOriginal = (image: UploadedImage) => {
  downloadImage({
    url: image.originalUrl,
    filename: image.fileName
  })
}

// 下载缩略图
const handleDownloadThumbnail = (image: UploadedImage) => {
  downloadImage({
    url: image.thumbnailUrl,
    filename: `缩略图_${image.fileName}`
  })
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">图片上传</h1>
    <p class="page-description">上传图片会自动生成缩略图，支持多种图片格式</p>

    <!-- 分类选择 -->
    <div class="category-selector">
      <label>选择分类：</label>
      <t-select
        v-model="selectedCategory"
        placeholder="请选择分类"
        style="width: 200px;"
      >
        <t-option
          v-for="option in categoryOptions"
          :key="option.value"
          :value="option.value"
          :label="option.label"
        />
      </t-select>
    </div>

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

    <div
      class="uploaded-list"
      v-else-if="uploadedImages.length > 0"
    >
      <div class="section-header">
        <h2 class="section-title">已上传图片</h2>
        <div class="section-actions">
          <button
            class="btn"
            :class="{ 'btn-primary': isSelectionMode, 'btn-secondary': !isSelectionMode }"
            @click="toggleSelectionMode"
          >
            {{ isSelectionMode ? '退出选择' : '选择图片' }}
          </button>
          <button
            v-if="isSelectionMode"
            class="btn btn-secondary"
            @click="toggleSelectAll"
          >
            {{ isAllSelected ? '取消全选' : '全选' }}
          </button>
          <button
            v-if="isSelectionMode"
            class="btn btn-danger"
            @click="handleBatchDelete"
            :disabled="selectedImageIds.length === 0"
          >
            批量删除 ({{ selectedImageIds.length }})
          </button>
        </div>
      </div>

      <div class="list-container">
        <div
          v-for="image in uploadedImages"
          :key="image.id"
          class="image-item card"
          :class="{ 'image-selected': selectedImageIds.includes(image.id) }"
        >
          <div class="thumbnail-container">
            <img
              :src="image.thumbnailUrl"
              alt="缩略图"
              class="thumbnail"
            />
            <div
              v-if="isSelectionMode"
              class="selection-overlay"
              @click="toggleSelection(image.id)"
            >
              <div class="checkbox-container">
                <span
                  class="checkbox"
                  :class="{ 'checked': selectedImageIds.includes(image.id) }"
                ></span>
              </div>
            </div>
          </div>
          <div class="image-info">
            <div class="file-name">{{ image.fileName }}</div>
            <div class="file-meta">
              <span class="file-size">{{ image.fileSize }}</span>
              <span class="upload-time">{{ image.uploadTime }}</span>
            </div>
          </div>
          <div class="image-actions">
            <button
              class="btn btn-primary"
              @click="handleDownloadOriginal(image)"
            >
              下载原图
            </button>
            <button
              class="btn btn-secondary"
              @click="handleDownloadThumbnail(image)"
            >
              下载缩略图
            </button>
            <button
              class="btn btn-danger"
              @click="handleDeleteImage(image.id)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="empty-state"
    >
      <div class="empty-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64"
          height="64"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="M5 21q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.588 1.413T19 21H5Zm0-2h14V5H5v14Zm0 0V5v14Zm7-7q1.25 0 2.125-.875T15 9q0-1.25-.875-2.125T12 6q-1.25 0-2.125.875T9 9q0 1.25.875 2.125T12 12Zm-6 6h12v-2q0-.825-.425-1.213T16 14.275q-1 .85-2.288 1.288T11.975 16q-1.45 0-2.75-.438T7 14.275q-.55.125-1 .5T5.025 16L5 18h1Z"
          />
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
  padding: 20px;
}

.category-selector {
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
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
  position: relative;
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-actions {
  display: flex;
  gap: 8px;
}

.selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: pointer;
}

.image-item:hover .selection-overlay {
  opacity: 1;
}

.image-selected .selection-overlay {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.5);
}

.checkbox-container {
  position: absolute;
  top: 10px;
  right: 10px;
}

.checkbox {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid white;
  background-color: transparent;
  position: relative;
}

.checkbox.checked {
  background-color: var(--td-brand-color);
  border-color: var(--td-brand-color);
}

.checkbox.checked::after {
  content: "";
  position: absolute;
  top: 5px;
  left: 9px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
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
