<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-container">
    <div class="nav-header">
      <h1>壁纸应用</h1>
      <div class="nav-links">
        <RouterLink to="/" class="nav-link" active-class="active-link" exact>首页</RouterLink>
        <RouterLink to="/manage" class="nav-link" active-class="active-link">图片管理</RouterLink>
        <RouterLink to="/about" class="nav-link" active-class="active-link">关于</RouterLink>
      </div>
    </div>
    <div class="main-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  min-height: 100vh;
  background-color: var(--bg-light);
}

.nav-header {
  background-color: var(--primary-color);
  color: white;
  padding: var(--spacing-sm) var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--box-shadow);
}

.nav-links {
  display: flex;
  gap: var(--spacing-lg);
}

.nav-link {
  color: white;
  text-decoration: none;
  font-size: 16px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.active-link {
  background-color: rgba(255, 255, 255, 0.3);
  font-weight: bold;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
}

.main-content {
  padding: var(--spacing-md);
}
</style>
