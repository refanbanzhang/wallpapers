<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { clearAuthToken, hasManagePermission, isAuthenticated } from '@/utils/auth'

const router = useRouter()
const route = useRoute()

const authLabel = computed(() => (isAuthenticated.value ? '退出登录' : '登录'))

const handleAuthClick = async () => {
  if (!isAuthenticated.value) {
    await router.push('/login')
    return
  }

  clearAuthToken()
  if (route.path.startsWith('/manage')) {
    await router.replace('/login')
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-top">
        <div class="header-inner top-inner">
          <RouterLink to="/" class="brand-link">Wallpaper Studio</RouterLink>
          <p class="brand-note">A visual vault for your desktop mood</p>
        </div>
      </div>

      <div class="header-main">
        <div class="header-inner nav-inner">
          <nav class="nav-links">
            <RouterLink to="/" class="nav-link" active-class="active-link">首页</RouterLink>
            <RouterLink
              v-if="hasManagePermission"
              to="/manage"
              class="nav-link"
              active-class="active-link"
            >
              图片管理
            </RouterLink>
            <RouterLink
              v-if="hasManagePermission"
              to="/dashboard"
              class="nav-link"
              active-class="active-link"
            >
              数据仪表盘
            </RouterLink>
            <RouterLink to="/about" class="nav-link" active-class="active-link">关于</RouterLink>
          </nav>

          <button
            type="button"
            class="auth-btn"
            @click="handleAuthClick"
          >
            {{ authLabel }}
          </button>
        </div>
      </div>
    </header>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: clamp(10px, 1.8vw, 22px);
}

.site-header {
  max-width: 1320px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.08);
}

.header-top {
  background: #1f1f1f;
  color: #f1f1f1;
  border-bottom: 1px solid #2d2d2d;
}

.header-main {
  background: #ffffff;
}

.header-inner {
  width: min(100%, 1320px);
  margin: 0 auto;
  padding: 0 18px;
}

.top-inner {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brand-link {
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.brand-note {
  font-size: 12px;
  color: #bdbdbd;
}

.nav-inner {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nav-link {
  min-height: 40px;
  padding: 8px 15px;
  border-radius: 999px;
  border: 1px solid transparent;
  color: #444444;
  font-size: 14px;
  font-weight: 600;
  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.nav-link:hover {
  color: #1f1f1f;
  background: #f6f6f6;
  border-color: #e0e0e0;
}

.active-link {
  color: #1f1f1f;
  background: #f2f2f2;
  border-color: #d9d9d9;
}

.auth-btn {
  min-height: 40px;
  min-width: 96px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #2e2e2e;
  background: #232323;
  color: #ffffff;
  font-weight: 600;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.auth-btn:hover {
  transform: translateY(-1px);
  background: #343434;
  box-shadow: 0 8px 16px rgba(17, 17, 17, 0.2);
}

.main-content {
  max-width: 1320px;
  margin: 16px auto 0;
}

@media (max-width: 860px) {
  .header-inner {
    padding: 0 12px;
  }

  .top-inner {
    min-height: 36px;
  }

  .brand-note {
    display: none;
  }

  .nav-inner {
    min-height: auto;
    padding-top: 10px;
    padding-bottom: 10px;
    flex-direction: column;
    align-items: stretch;
  }

  .nav-links {
    width: 100%;
    justify-content: space-between;
  }

  .nav-link {
    flex: 1;
    text-align: center;
  }

  .auth-btn {
    width: 100%;
  }
}
</style>
