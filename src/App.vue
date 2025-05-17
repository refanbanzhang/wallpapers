<script setup lang="ts">
import 'tdesign-vue-next/es/style/index.css'
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-container">
    <div class="nav-header">
      <h1>壁纸应用</h1>
      <div class="nav-links">
        <RouterLink to="/" class="nav-link">首页</RouterLink>
        <RouterLink to="/upload" class="nav-link">上传</RouterLink>
        <RouterLink to="/about" class="nav-link">关于</RouterLink>
      </div>
    </div>
    <RouterView />
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
}

.nav-header {
  background-color: #0052d9;
  color: white;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>
