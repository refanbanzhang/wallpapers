<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Dialog as TDialog, Button as TButton } from 'tdesign-vue-next'
import { downloadWallpaper } from '@/utils/download'
import { getImageResolution } from '@/utils/image'

import img1 from '@/assets/images/1.jpg'
import img2 from '@/assets/images/2.jpg'

interface Wallpaper {
  id: string
  urls: {
    small: string
    regular?: string
  }
  alt_description: string
  resolution?: {
    width: number
    height: number
  }
}

const wallpapers = ref<Wallpaper[]>([
  {
    id: '1',
    urls: {
      small: img1,
      regular: img1,
    },
    alt_description: 'Wallpaper 1',
  },
  {
    id: '2',
    urls: {
      small: img2,
      regular: img2,
    },
    alt_description: 'Wallpaper 2',
  },
  {
    id: '3',
    urls: {
      small: img1,
      regular: img1,
    },
    alt_description: 'Wallpaper 3',
  },
  {
    id: '4',
    urls: {
      small: img2,
      regular: img2,
    },
    alt_description: 'Wallpaper 4',
  },
  {
    id: '5',
    urls: {
      small: img1,
      regular: img1,
    },
    alt_description: 'Wallpaper 5',
  },
  {
    id: '6',
    urls: {
      small: img2,
      regular: img2,
    },
    alt_description: 'Wallpaper 6',
  },
])

const dialogVisible = ref(false)
const currentWallpaper = ref<Wallpaper | null>(null)
const loading = ref(false)

// 获取所有壁纸的分辨率
const loadResolutions = async () => {
  for (const wallpaper of wallpapers.value) {
    try {
      // 使用regular或small链接获取分辨率
      const imageUrl = wallpaper.urls.regular || wallpaper.urls.small
      const resolution = await getImageResolution(imageUrl)
      wallpaper.resolution = resolution
    } catch (error) {
      console.error(`获取壁纸 ${wallpaper.id} 分辨率失败:`, error)
    }
  }
}

// 组件挂载后加载分辨率
onMounted(() => {
  loadResolutions()
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

    const imageUrl = currentWallpaper.value.urls.regular || currentWallpaper.value.urls.small
    const imageName =
      currentWallpaper.value.alt_description || `wallpaper-${currentWallpaper.value.id}`

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

    <div class="wallpapers-grid">
      <div
        class="wallpaper-card"
        v-for="wallpaper in wallpapers"
        :key="wallpaper.id"
        @click="onOpenModal(wallpaper)"
      >
        <img
          :src="wallpaper.urls.small"
          :alt="wallpaper.alt_description"
        />
        <div class="wallpaper-info">
          <span
            class="wallpaper-resolution"
            v-if="wallpaper.resolution"
          >
            {{ wallpaper.resolution.width }} × {{ wallpaper.resolution.height }}
          </span>
        </div>
      </div>
    </div>

    <t-dialog
      :visible="dialogVisible"
      :header="currentWallpaper?.alt_description"
      attach="body"
      @close="onCloseDialog"
    >
      <div
        v-if="currentWallpaper"
        class="dialog-content"
      >
        <img
          :src="currentWallpaper.urls.regular || currentWallpaper.urls.small"
          :alt="currentWallpaper.alt_description"
          class="dialog-image"
        />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <t-button
            theme="default"
            @click="onCloseDialog"
            >关闭</t-button
          >
          <t-button
            theme="primary"
            :loading="loading"
            @click="handleDownload"
            >下载</t-button
          >
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
  justify-content: flex-end;
}

.wallpaper-resolution {
  font-family: 'Courier New', monospace;
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
}

.resolution-text {
  font-family: 'Courier New', monospace;
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
</style>
