<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { clearAuthToken, hasManagePermission, isAuthenticated } from '@/utils/auth'
import { getRouteLabel } from '@/utils/experience'
import { readStorageString, writeStorageString } from '@/utils/storage'

const LAST_ROUTE_KEY = 'wallpaper_last_route'

const router = useRouter()
const route = useRoute()
const lastRoute = ref(readStorageString(LAST_ROUTE_KEY, ''))

const authLabel = computed(() => (isAuthenticated.value ? '退出登录' : '登录'))
const currentRouteLabel = computed(() => getRouteLabel(route.path))
const lastRouteLabel = computed(() => (lastRoute.value ? getRouteLabel(lastRoute.value) : ''))
const canResume = computed(
  () => Boolean(lastRoute.value && lastRoute.value !== '/login' && lastRoute.value !== route.path),
)
const shortcutHint = 'Alt+1 首页 · Alt+2 管理 · Alt+3 仪表盘 · Alt+4 关于 · Alt+L 登录/退出'

const navigateTo = async (path: string) => {
  await router.push(path)
}

const resumeLastRoute = async () => {
  if (!lastRoute.value || lastRoute.value === '/login') {
    return
  }

  await router.push(lastRoute.value)
}

const handleAuthClick = async () => {
  if (!isAuthenticated.value) {
    await router.push('/login')
    return
  }

  clearAuthToken()
  if (route.matched.some((record) => record.meta.requiresAuth)) {
    await router.replace('/')
  }
}

watch(
  () => route.path,
  (path) => {
    if (path === '/login') {
      return
    }

    lastRoute.value = path
    writeStorageString(LAST_ROUTE_KEY, path)
  },
  { immediate: true },
)

let removeShortcutListener = () => {}

const handleGlobalShortcut = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  const editableTarget =
    Boolean(target) &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      Boolean(target?.isContentEditable))

  if (editableTarget) {
    return
  }

  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    const key = event.key.toLowerCase()
    if (key === '1') {
      event.preventDefault()
      void navigateTo('/')
    } else if (key === '2' && hasManagePermission.value) {
      event.preventDefault()
      void navigateTo('/manage')
    } else if (key === '3' && hasManagePermission.value) {
      event.preventDefault()
      void navigateTo('/dashboard')
    } else if (key === '4') {
      event.preventDefault()
      void navigateTo('/about')
    } else if (key === 'l') {
      event.preventDefault()
      void handleAuthClick()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalShortcut)
  removeShortcutListener = () => window.removeEventListener('keydown', handleGlobalShortcut)
})

onBeforeUnmount(() => {
  removeShortcutListener()
})
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-top">
        <div class="header-inner top-inner">
          <div class="brand-block">
            <RouterLink to="/" class="brand-link">Wallpaper Studio</RouterLink>
            <p class="brand-note">A visual vault for your desktop mood</p>
          </div>
          <div class="header-meta">
            <span class="context-chip">{{ currentRouteLabel }}</span>
            <span class="shortcut-chip">{{ shortcutHint }}</span>
          </div>
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

            <button
              v-if="canResume"
              type="button"
              class="nav-link nav-link-button"
              @click="resumeLastRoute"
            >
              继续上次浏览 · {{ lastRouteLabel }}
            </button>
          </nav>

          <button type="button" class="auth-btn" @click="handleAuthClick">
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
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 16px 42px rgba(17, 17, 17, 0.1);
  backdrop-filter: blur(18px);
}

.header-top {
  background:
    linear-gradient(135deg, rgba(19, 19, 19, 0.96) 0%, rgba(40, 40, 40, 0.94) 100%);
  color: #f3f3f3;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-main {
  background: rgba(255, 255, 255, 0.95);
}

.header-inner {
  width: min(100%, 1320px);
  margin: 0 auto;
  padding: 0 18px;
}

.top-inner {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brand-block {
  display: grid;
  gap: 2px;
}

.brand-link {
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.brand-note {
  font-size: 12px;
  color: #bebebe;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.context-chip,
.shortcut-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: #f5f5f5;
  font-size: 12px;
}

.shortcut-chip {
  color: #d5d5d5;
  background: rgba(255, 255, 255, 0.05);
}

.nav-inner {
  min-height: 66px;
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
    background-color 0.18s ease,
    transform 0.18s ease;
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

.nav-link-button {
  background: #ffffff;
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
    min-height: auto;
    padding-top: 10px;
    padding-bottom: 10px;
    flex-direction: column;
    align-items: flex-start;
  }

  .header-meta {
    width: 100%;
    justify-content: flex-start;
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

  .nav-link-button {
    flex-basis: 100%;
  }

  .auth-btn {
    width: 100%;
  }
}
</style>
