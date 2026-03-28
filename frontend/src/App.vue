<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

import {
  clearAuthToken,
  hasManagePermission,
  isAuthenticated,
} from "@/utils/auth";
import { readStorageString, writeStorageString } from "@/utils/storage";

const LAST_ROUTE_KEY = "wallpaper_last_route";

const router = useRouter();
const route = useRoute();
const lastRoute = ref(readStorageString(LAST_ROUTE_KEY, ""));

const authLabel = computed(() => (isAuthenticated.value ? "退出登录" : "登录"));
const canResume = computed(() =>
  Boolean(
    lastRoute.value &&
      lastRoute.value !== "/login" &&
      lastRoute.value !== route.path,
  ),
);
const navItems = computed(() => {
  const items = [{ to: "/", label: "Discovery" }];

  if (hasManagePermission.value) {
    items.push(
      { to: "/manage", label: "Desktop Vault" },
      { to: "/dashboard", label: "Pulse" },
    );
  }

  items.push({ to: "/about", label: "About" });
  return items;
});
const primaryActionLabel = computed(() =>
  hasManagePermission.value ? "Upload Ultra-Wide" : "Member Access",
);

const navigateTo = async (path: string) => {
  if (route.path === path) {
    return;
  }

  await router.push(path);
};

const resumeLastRoute = async () => {
  if (!lastRoute.value || lastRoute.value === "/login") {
    return;
  }

  await navigateTo(lastRoute.value);
};

const handleAuthClick = async () => {
  if (!isAuthenticated.value) {
    await navigateTo("/login");
    return;
  }

  clearAuthToken();
  if (route.matched.some((record) => record.meta.requiresAuth)) {
    await router.replace("/");
  }
};

const handlePrimaryAction = async () => {
  if (hasManagePermission.value) {
    await navigateTo("/manage");
    return;
  }

  await navigateTo("/login");
};

watch(
  () => route.path,
  (path) => {
    if (path === "/login") {
      return;
    }

    lastRoute.value = path;
    writeStorageString(LAST_ROUTE_KEY, path);
  },
  { immediate: true },
);

let removeShortcutListener = () => {};

const handleGlobalShortcut = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  const editableTarget =
    Boolean(target) &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      Boolean(target?.isContentEditable));

  if (editableTarget) {
    return;
  }

  if (event.altKey && !event.ctrlKey && !event.metaKey) {
    const key = event.key.toLowerCase();

    if (key === "1") {
      event.preventDefault();
      void navigateTo("/");
    } else if (key === "2" && hasManagePermission.value) {
      event.preventDefault();
      void navigateTo("/manage");
    } else if (key === "3" && hasManagePermission.value) {
      event.preventDefault();
      void navigateTo("/dashboard");
    } else if (key === "4") {
      event.preventDefault();
      void navigateTo("/about");
    } else if (key === "l") {
      event.preventDefault();
      void handleAuthClick();
    }
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleGlobalShortcut);
  removeShortcutListener = () =>
    window.removeEventListener("keydown", handleGlobalShortcut);
});

onBeforeUnmount(() => {
  removeShortcutListener();
});
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-shell">
        <div class="brand-group">
          <RouterLink to="/" class="brand-link">The Silent Curator</RouterLink>
          <p class="brand-note">A quiet archive for desktop atmospheres.</p>
        </div>

        <nav class="primary-nav" aria-label="Primary navigation">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ 'is-active': route.path === item.to }"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div id="site-header-search" class="header-search"></div>

        <div class="header-actions">
          <button
            v-if="canResume"
            type="button"
            class="action-pill action-pill-secondary"
            @click="resumeLastRoute"
          >
            Continue
          </button>

          <button
            type="button"
            class="action-pill action-pill-primary"
            @click="handlePrimaryAction"
          >
            {{ primaryActionLabel }}
          </button>

          <button
            type="button"
            class="profile-button"
            :aria-label="authLabel"
            :title="authLabel"
            @click="handleAuthClick"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.32 0-6 2.01-6 4.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5C18 16.01 15.32 14 12 14Z"
              />
            </svg>
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
  height: 100%;
  overflow-y: auto;
  padding: clamp(12px, 1.5vw, 22px);
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
}

.header-shell {
  display: grid;
  grid-template-columns: auto auto minmax(260px, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 16px 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 40px rgba(40, 52, 57, 0.06);
}

.brand-group {
  display: grid;
  gap: 4px;
}

.brand-link {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.brand-note {
  color: var(--text-tertiary);
  font-size: 0.82rem;
  line-height: 1.45;
}

.primary-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-link {
  position: relative;
  padding: 10px 12px;
  color: var(--text-secondary);
  font-family: var(--font-display);
  font-size: 0.96rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  transition:
    color 0.22s ease,
    transform 0.22s ease;
}

.nav-link::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 6px;
  height: 2px;
  border-radius: 999px;
  background: transparent;
  transition: background-color 0.22s ease;
}

.nav-link:hover {
  color: var(--text-primary);
  transform: translateY(-1px);
}

.nav-link.is-active {
  color: var(--text-primary);
}

.nav-link.is-active::after {
  background: var(--text-primary);
}

.header-search {
  min-width: 0;
  display: flex;
  justify-content: center;
}

.header-search:empty {
  display: none;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.action-pill {
  min-height: 46px;
  padding: 0 20px;
  border: 0;
  border-radius: 14px;
  font-family: var(--font-body);
  font-size: 0.92rem;
  font-weight: 600;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    color 0.22s ease;
}

.action-pill:hover {
  transform: translateY(-1px);
}

.action-pill-primary {
  color: #f7f7ff;
  background: var(--signature-gradient);
  box-shadow: 0 16px 30px rgba(76, 82, 96, 0.16);
}

.action-pill-primary:hover {
  box-shadow: 0 18px 34px rgba(76, 82, 96, 0.22);
}

.action-pill-secondary {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(167, 180, 186, 0.22);
}

.profile-button {
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(167, 180, 186, 0.18);
  color: var(--text-secondary);
  transition:
    transform 0.22s ease,
    background-color 0.22s ease,
    color 0.22s ease;
}

.profile-button:hover {
  transform: translateY(-1px);
  color: var(--text-primary);
  background: #ffffff;
}

.profile-button svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.main-content {
  width: 100%;
  padding-top: 18px;
}

@media (max-width: 1180px) {
  .header-shell {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .primary-nav,
  .header-search {
    grid-column: 1 / -1;
  }

  .header-search {
    justify-content: stretch;
  }
}

@media (max-width: 760px) {
  .app-shell {
    padding: 10px;
  }

  .header-shell {
    padding: 14px;
    border-radius: 20px;
    gap: 14px;
  }

  .brand-link {
    font-size: 1.32rem;
  }

  .brand-note {
    display: none;
  }

  .primary-nav {
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .primary-nav::-webkit-scrollbar {
    display: none;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
    grid-column: 1 / -1;
  }

  .action-pill {
    flex: 1;
  }

  .profile-button {
    flex: 0 0 46px;
  }
}
</style>
