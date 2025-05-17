<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Dialog as TDialog, Button as TButton, Loading as TLoading } from 'tdesign-vue-next'
import { downloadWallpaper } from '@/utils/download'
import { getImageResolution } from '@/utils/image'

interface Wallpaper {
  id: string
  fileName: string
  originalUrl: string
  thumbnailUrl: string
  fileSize: number
  uploadTime: string
  resolution?: {
    width: number
    height: number
  }
}

const wallpapers = ref<Wallpaper[]>([])
const dialogVisible = ref(false)
const currentWallpaper = ref<Wallpaper | null>(null)
const loading = ref(false)
const isLoading = ref(false)

// 从API获取壁纸数据
const fetchWallpapers = async () => {
  try {
    isLoading.value = true
    const response = await fetch('/api/images')
    const result = await response.json()

    if (result.success) {
      wallpapers.value = result.data
      // 获取所有壁纸的分辨率
      loadResolutions()
    } else {
      console.error('获取壁纸失败:', result.error)
    }
  } catch (error) {
    console.error('获取壁纸列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 获取所有壁纸的分辨率
const loadResolutions = async () => {
  for (const wallpaper of wallpapers.value) {
    try {
      // 使用原始图片链接获取分辨率
      const imageUrl = `http://localhost:3000${wallpaper.originalUrl}`
      const resolution = await getImageResolution(imageUrl)
      wallpaper.resolution = resolution
    } catch (error) {
      console.error(`获取壁纸 ${wallpaper.id} 分辨率失败:`, error)
    }
  }
}

// 组件挂载后获取壁纸数据
onMounted(() => {
  fetchWallpapers()
})

const onOpenModal = (wallpaper: Wallpaper) => {
  currentWallpaper.value = wallpaper
  dialogVisible.value = true
}

const onCloseDialog = () => {
  dialogVisible.value = false
}

const handleDownload = async () => {
  if (!currentWallpaper.value) return

  try {
    loading.value = true

    const imageUrl = `http://localhost:3000${currentWallpaper.value.originalUrl}`
    const imageName = currentWallpaper.value.fileName || `wallpaper-${currentWallpaper.value.id}`

    await downloadWallpaper(imageUrl, imageName)
  } catch (error) {
    console.error('下载失败', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">壁纸库</h1>

    <div v-if="isLoading" class="loading-container">
      <t-loading />
    </div>

    <div v-else-if="wallpapers.length === 0" class="empty-state">
      没有找到壁纸，请上传一些壁纸
    </div>

    <div v-else class="wallpapers-grid">
      <div class="wallpaper-card" v-for="wallpaper in wallpapers" :key="wallpaper.id" @click="onOpenModal(wallpaper)">
        <img :src="`http://localhost:3000${wallpaper.thumbnailUrl}`" :alt="wallpaper.fileName" />
        <div class="wallpaper-info">
          <span class="wallpaper-name">{{ wallpaper.fileName }}</span>
          <span class="wallpaper-resolution" v-if="wallpaper.resolution">
            {{ wallpaper.resolution.width }} × {{ wallpaper.resolution.height }}
          </span>
        </div>
      </div>
    </div>

    <t-dialog :visible="dialogVisible" :header="currentWallpaper?.fileName" attach="body" @close="onCloseDialog">
      <div v-if="currentWallpaper" class="dialog-content">
        <img :src="`http://localhost:3000${currentWallpaper.originalUrl}`" :alt="currentWallpaper.fileName"
          class="dialog-image" />
        <div class="dialog-image-info">
          <p>上传时间: {{ currentWallpaper.uploadTime }}</p>
          <p>文件大小: {{ Math.round(currentWallpaper.fileSize / 1024) }} KB</p>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <t-button theme="default" @click="onCloseDialog">关闭</t-button>
          <t-button theme="primary" :loading="loading" @click="handleDownload">下载</t-button>
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<style scoped>
.wallpapers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.wallpaper-card {
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--box-shadow);
  cursor: pointer;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  aspect-ratio: 16/9;
  position: relative;
}

.wallpaper-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--box-shadow-hover);
}

.wallpaper-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wallpaper-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 5px 8px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
}

.wallpaper-resolution {
  font-family: 'Courier New', monospace;
}

.wallpaper-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-lg);
}

.dialog-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: var(--border-radius);
}

.dialog-image-info {
  margin-top: var(--spacing-sm);
  font-size: 14px;
  color: var(--text-secondary);
  width: 100%;
}

.dialog-image-info p {
  margin: 5px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.empty-state {
  text-align: center;
  margin-top: 50px;
  color: var(--text-secondary);
}
</style>
