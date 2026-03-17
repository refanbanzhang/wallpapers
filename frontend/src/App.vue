<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <div class="ambient-layer" aria-hidden="true" />

    <header class="topbar">
      <RouterLink to="/" class="brand">
        <span class="brand-mark" />
        <div>
          <p class="brand-name">Wallpaper Studio</p>
          <p class="brand-subtitle">A visual vault for your desktop mood</p>
        </div>
      </RouterLink>

      <nav class="nav-links">
        <RouterLink to="/" class="nav-link" active-class="active-link">首页</RouterLink>
        <RouterLink to="/manage" class="nav-link" active-class="active-link">图片管理</RouterLink>
        <RouterLink to="/about" class="nav-link" active-class="active-link">关于</RouterLink>
      </nav>
    </header>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 20px;
  position: relative;
}

.ambient-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 10% 10%, rgba(84, 129, 255, 0.2), transparent 40%),
    radial-gradient(circle at 80% 0%, rgba(40, 209, 178, 0.2), transparent 30%),
    radial-gradient(circle at 90% 90%, rgba(255, 149, 84, 0.12), transparent 35%);
}

.topbar,
.main-content {
  position: relative;
  z-index: 1;
}

.topbar {
  max-width: 1320px;
  margin: 0 auto;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-primary);
}

.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(140deg, var(--brand-500), var(--accent-500));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
}

.brand-name {
  font-size: 18px;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.2px;
}

.brand-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.nav-link {
  min-height: 40px;
  padding: 9px 15px;
  border-radius: 999px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 14px;
  transition: all 0.24s ease;
}

.nav-link:hover {
  color: var(--text-primary);
  background: rgba(84, 129, 255, 0.12);
}

.active-link {
  color: #fff;
  background: linear-gradient(120deg, var(--brand-500), var(--brand-400));
  box-shadow: 0 10px 18px rgba(84, 129, 255, 0.3);
}

.main-content {
  max-width: 1320px;
  margin: 18px auto 0;
}

@media (max-width: 860px) {
  .app-shell {
    padding: 14px;
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .nav-links {
    justify-content: space-between;
  }

  .nav-link {
    flex: 1;
    text-align: center;
  }

  .brand-subtitle {
    display: none;
  }
}
</style>
