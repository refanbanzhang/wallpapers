<script setup lang="ts">
import { ref } from 'vue'

import img1 from '@/assets/1.jpg'
import img2 from '@/assets/2.jpg'

interface Wallpaper {
  id: string
  urls: {
    small: string
  }
  alt_description: string
}

const wallpapers = ref<Wallpaper[]>([
  {
    id: '1',
    urls: {
      small: img1,
    },
    alt_description: 'Wallpaper 1',
  },
  {
    id: '2',
    urls: {
      small: img2,
    },
    alt_description: 'Wallpaper 2',
  },
  {
    id: '3',
    urls: {
      small: img1,
    },
    alt_description: 'Wallpaper 2',  
  },
  {
    id: '4',
    urls: {
      small: img2,
    },
    alt_description: 'Wallpaper 2',
  },
  {
    id: '5',
    urls: {
      small: img1,
    },
    alt_description: 'Wallpaper 2',
  },
  {
    id: '6',
    urls: {
      small: img2,
    },
    alt_description: 'Wallpaper 2',
  },
])

const onOpenModal = (wallpaper: Wallpaper) => {
  console.log(wallpaper)
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
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
