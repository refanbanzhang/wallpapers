<script setup lang="ts">
import { ref } from 'vue'
import { Dialog as TDialog, Button as TButton } from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'
import { downloadWallpaper } from '@/utils/download'

import img1 from '@/assets/images/1.jpg'
import img2 from '@/assets/images/2.jpg'

interface Wallpaper {
  id: string
  urls: {
    small: string
    regular?: string
  }
  alt_description: string
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
    const imageName = currentWallpaper.value.alt_description || `wallpaper-${currentWallpaper.value.id}`

    await downloadWallpaper(imageUrl, imageName)
  } catch (error) {
    console.error('下载失败', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Wallpapers</h1>
    </div>
    <div class="wallpapers">
      <div
        class="wallpaper"
        v-for="wallpaper in wallpapers"
        :key="wallpaper.id"
        @click="onOpenModal(wallpaper)"
      >
        <img :src="wallpaper.urls.small" :alt="wallpaper.alt_description" />
      </div>
    </div>

    <t-dialog
      :visible="dialogVisible"
      :header="currentWallpaper?.alt_description"
      attach="body"
      @close="onCloseDialog"
    >
      <div v-if="currentWallpaper" class="dialog-content">
        <img
          :src="currentWallpaper.urls.regular || currentWallpaper.urls.small"
          :alt="currentWallpaper.alt_description"
          class="dialog-image"
        />
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
.container {
  width: 100%;
  height: 100%;
}

.header {
  padding: 10px;
}

.wallpapers {
  display: flex;
  flex-wrap: wrap;
  padding: 5px;
}

.wallpaper {
  width: 20%;
  padding: 5px;
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.wallpaper:hover {
  transform: scale(1.05);
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dialog-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.dialog-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
