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
  padding: clamp(12px, 2vw, 24px);
  position: relative;
}

.ambient-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 8% 8%, rgba(116, 167, 255, 0.28), transparent 36%),
    radial-gradient(circle at 88% 5%, rgba(102, 227, 214, 0.24), transparent 28%),
    radial-gradient(circle at 86% 84%, rgba(255, 198, 131, 0.18), transparent 32%),
    radial-gradient(circle at 18% 78%, rgba(117, 153, 255, 0.16), transparent 30%);
}

.topbar,
.main-content {
  position: relative;
  z-index: 1;
}

.topbar {
  max-width: 1320px;
  margin: 0 auto;
  padding: 14px 18px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.74), rgba(240, 248, 255, 0.48));
  backdrop-filter: blur(20px) saturate(145%);
  -webkit-backdrop-filter: blur(20px) saturate(145%);
  box-shadow: var(--glass-shadow-soft), inset 0 1px 0 rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--text-primary);
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.3)),
    linear-gradient(140deg, #62a0ff, #56d4c5);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    0 10px 18px rgba(74, 113, 182, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
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
  min-height: 42px;
  padding: 8px 16px;
  border-radius: 999px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 14px;
  transition:
    color 0.24s ease,
    box-shadow 0.24s ease,
    background-color 0.24s ease;
  border: 1px solid transparent;
}

.nav-link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.44);
  border-color: rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.active-link {
  color: #0f2c4e;
  border-color: rgba(255, 255, 255, 0.65);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(184, 220, 255, 0.56));
  box-shadow:
    0 10px 22px rgba(86, 125, 186, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
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
    border-radius: 26px;
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
