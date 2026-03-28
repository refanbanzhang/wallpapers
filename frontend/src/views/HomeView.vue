<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Dialog as TDialog,
  Loading as TLoading,
  MessagePlugin,
} from "tdesign-vue-next";

import { getImages, trackVisit, type ImageItem } from "@/api/index";
import { downloadImage } from "@/utils/download";
import { formatDateTime, formatRelativeTime } from "@/utils/experience";
import { getFileExtension } from "@/utils/image";
import {
  readStorage,
  readStorageString,
  writeStorage,
  writeStorageString,
} from "@/utils/storage";
import { formatFileSize } from "@/utils/upload";

type Wallpaper = ImageItem;

interface CategoryOption {
  value: string;
  label: string;
}

interface SortOption {
  value: string;
  label: string;
}

interface PaginationItem {
  key: string;
  type: "page" | "ellipsis";
  value?: number;
}

const route = useRoute();
const router = useRouter();

const categoryCatalog: CategoryOption[] = [
  { value: "all", label: "All Curations" },
  { value: "nature", label: "Nature" },
  { value: "beauty", label: "Portrait" },
  { value: "anime", label: "Anime" },
];

const sortCatalog: SortOption[] = [
  { value: "latest", label: "Latest" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "size-desc", label: "Largest" },
  { value: "size-asc", label: "Smallest" },
];

const densityCatalog = [
  { value: "comfortable", label: "Editorial" },
  { value: "compact", label: "Compact" },
];

const HOME_FILTERS_KEY = "wallpaper_home_filters";
const HOME_RECENTS_KEY = "wallpaper_home_recents";
const HOME_LAST_VIEWED_KEY = "wallpaper_home_last_viewed";

const wallpapers = ref<Wallpaper[]>([]);
const dialogVisible = ref(false);
const currentWallpaper = ref<Wallpaper | null>(null);
const isLoading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);

const savedFilters = readStorage(HOME_FILTERS_KEY, {
  category: "all",
  keyword: "",
  sort: "latest",
  density: "comfortable",
});

const activeCategory = ref(savedFilters.category);
const searchKeyword = ref(savedFilters.keyword);
const sortOption = ref(savedFilters.sort);
const density = ref(savedFilters.density);
const searchInput = ref(savedFilters.keyword);
const searchTimeout = ref<number | null>(null);
const recentIds = ref<string[]>(readStorage(HOME_RECENTS_KEY, []));

const categoryOptions = computed(() =>
  categoryCatalog.map((item) => ({
    ...item,
    count:
      item.value === "all"
        ? wallpapers.value.length
        : wallpapers.value.filter(
            (wallpaper) => wallpaper.category === item.value,
          ).length,
  })),
);

const getCategoryLabel = (value?: string | null) => {
  if (!value) {
    return "Unsorted";
  }

  return (
    categoryCatalog.find((item) => item.value === value)?.label || "Unsorted"
  );
};

const getSortLabel = (value: string) =>
  sortCatalog.find((item) => item.value === value)?.label || "Latest";

const formatWallpaperTitle = (fileName: string) => {
  const title = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title || fileName;
};

const filteredWallpapers = computed(() => {
  let filtered =
    activeCategory.value === "all"
      ? [...wallpapers.value]
      : wallpapers.value.filter(
          (wallpaper) => wallpaper.category === activeCategory.value,
        );

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase();
    filtered = filtered.filter((wallpaper) =>
      wallpaper.fileName.toLowerCase().includes(keyword),
    );
  }

  switch (sortOption.value) {
    case "name-asc":
      filtered.sort((a, b) =>
        a.fileName.localeCompare(b.fileName, "zh-Hans-CN"),
      );
      break;
    case "name-desc":
      filtered.sort((a, b) =>
        b.fileName.localeCompare(a.fileName, "zh-Hans-CN"),
      );
      break;
    case "size-desc":
      filtered.sort((a, b) => b.fileSize - a.fileSize);
      break;
    case "size-asc":
      filtered.sort((a, b) => a.fileSize - b.fileSize);
      break;
    case "latest":
    default:
      filtered.sort(
        (a, b) =>
          new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime(),
      );
      break;
  }

  return filtered;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredWallpapers.value.length / pageSize.value)),
);

const pagedWallpapers = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value;
  return filteredWallpapers.value.slice(
    startIndex,
    startIndex + pageSize.value,
  );
});

const recentWallpapers = computed(() =>
  recentIds.value
    .map((id) => wallpapers.value.find((wallpaper) => wallpaper.id === id))
    .filter((wallpaper): wallpaper is Wallpaper => Boolean(wallpaper))
    .slice(0, 3),
);

const continueWallpaper = computed(() => {
  const id = readStorageString(HOME_LAST_VIEWED_KEY);
  return wallpapers.value.find((wallpaper) => wallpaper.id === id) || null;
});

const currentWallpaperIndex = computed(() =>
  currentWallpaper.value
    ? filteredWallpapers.value.findIndex(
        (wallpaper) => wallpaper.id === currentWallpaper.value?.id,
      )
    : -1,
);

const canGoPrev = computed(() => currentWallpaperIndex.value > 0);
const canGoNext = computed(
  () =>
    currentWallpaperIndex.value !== -1 &&
    currentWallpaperIndex.value < filteredWallpapers.value.length - 1,
);

const filterSummary = computed(() => {
  const parts: string[] = [getSortLabel(sortOption.value)];

  if (activeCategory.value !== "all") {
    parts.push(getCategoryLabel(activeCategory.value));
  }

  if (searchKeyword.value.trim()) {
    parts.push(`"${searchKeyword.value.trim()}"`);
  }

  parts.push(density.value === "compact" ? "Compact view" : "Editorial view");
  return parts.join(" · ");
});

const hasActiveFilters = computed(
  () =>
    activeCategory.value !== "all" ||
    Boolean(searchKeyword.value.trim()) ||
    sortOption.value !== "latest" ||
    density.value !== "comfortable",
);

const paginationItems = computed<PaginationItem[]>(() => {
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => ({
      key: `page-${index + 1}`,
      type: "page",
      value: index + 1,
    }));
  }

  const middlePages =
    current <= 3
      ? [2, 3, 4]
      : current >= total - 2
        ? [total - 3, total - 2, total - 1]
        : [current - 1, current, current + 1];

  const items: PaginationItem[] = [{ key: "page-1", type: "page", value: 1 }];

  if (middlePages[0] > 2) {
    items.push({ key: "ellipsis-left", type: "ellipsis" });
  }

  middlePages.forEach((page) => {
    items.push({ key: `page-${page}`, type: "page", value: page });
  });

  if (middlePages[middlePages.length - 1] < total - 1) {
    items.push({ key: "ellipsis-right", type: "ellipsis" });
  }

  items.push({ key: `page-${total}`, type: "page", value: total });
  return items;
});

const persistFilters = () => {
  writeStorage(HOME_FILTERS_KEY, {
    category: activeCategory.value,
    keyword: searchKeyword.value,
    sort: sortOption.value,
    density: density.value,
  });
};

const fetchWallpapers = async (search = "") => {
  try {
    isLoading.value = true;
    const data = await getImages(search);
    wallpapers.value = data;
    applyRouteFocus();
  } catch (error) {
    console.error("获取壁纸列表失败:", error);
    MessagePlugin.error("获取壁纸列表失败");
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = (value: string) => {
  searchInput.value = value;
  currentPage.value = 1;

  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }

  searchTimeout.value = window.setTimeout(() => {
    searchKeyword.value = value;
    void fetchWallpapers(value);
  }, 320);
};

const onSearchInput = (event: Event) => {
  handleSearch((event.target as HTMLInputElement).value);
};

const clearSearch = () => {
  handleSearch("");
};

const handleCategoryChange = (value: string) => {
  activeCategory.value = value;
  currentPage.value = 1;
};

const handleCurrentChange = (page: number) => {
  if (page < 1 || page > totalPages.value) {
    return;
  }

  currentPage.value = page;
};

const rememberRecent = (wallpaperId: string) => {
  recentIds.value = [
    wallpaperId,
    ...recentIds.value.filter((id) => id !== wallpaperId),
  ].slice(0, 8);
  writeStorage(HOME_RECENTS_KEY, recentIds.value);
  writeStorageString(HOME_LAST_VIEWED_KEY, wallpaperId);
};

const onOpenModal = (wallpaper: Wallpaper) => {
  currentWallpaper.value = wallpaper;
  dialogVisible.value = true;
  rememberRecent(wallpaper.id);
};

const onCloseDialog = () => {
  dialogVisible.value = false;
  currentWallpaper.value = null;
};

const openByIndex = (index: number) => {
  const wallpaper = filteredWallpapers.value[index];
  if (!wallpaper) {
    return;
  }

  onOpenModal(wallpaper);
};

const handleKeyboard = (event: KeyboardEvent) => {
  if (!dialogVisible.value) {
    return;
  }

  if (event.key === "Escape") {
    onCloseDialog();
    return;
  }

  if (event.key === "ArrowLeft" && canGoPrev.value) {
    openByIndex(currentWallpaperIndex.value - 1);
  }

  if (event.key === "ArrowRight" && canGoNext.value) {
    openByIndex(currentWallpaperIndex.value + 1);
  }
};

const pickRandomWallpaper = () => {
  if (filteredWallpapers.value.length === 0) {
    return;
  }

  const index = Math.floor(Math.random() * filteredWallpapers.value.length);
  onOpenModal(filteredWallpapers.value[index]);
};

const resetFilters = () => {
  activeCategory.value = "all";
  sortOption.value = "latest";
  density.value = "comfortable";
  currentPage.value = 1;
  clearSearch();
};

const resumeLastViewed = () => {
  if (continueWallpaper.value) {
    onOpenModal(continueWallpaper.value);
  }
};

const applyRouteFocus = () => {
  const focusId =
    typeof route.query.focus === "string" ? route.query.focus : "";
  if (!focusId || dialogVisible.value) {
    return;
  }

  const target = wallpapers.value.find((wallpaper) => wallpaper.id === focusId);
  if (!target) {
    return;
  }

  onOpenModal(target);
  void router.replace({ query: { ...route.query, focus: undefined } });
};

const downloadCurrentWallpaper = async () => {
  if (!currentWallpaper.value) {
    return;
  }

  try {
    const extension =
      getFileExtension(currentWallpaper.value.fileName) || "jpg";
    await downloadImage({
      url: currentWallpaper.value.originalUrl,
      filename: formatWallpaperTitle(currentWallpaper.value.fileName),
      extension,
    });
    MessagePlugin.success("原图已开始下载");
  } catch (error) {
    console.error("下载壁纸失败:", error);
    MessagePlugin.error("下载失败，请稍后重试");
  }
};

watch([activeCategory, sortOption, density], () => {
  currentPage.value = 1;
  persistFilters();
});

watch(searchKeyword, persistFilters);

watch([filteredWallpapers, pageSize], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
});

onMounted(() => {
  window.addEventListener("keydown", handleKeyboard);
  trackVisit(window.location.pathname).catch((error) => {
    console.error("访问统计上报失败:", error);
  });
  void fetchWallpapers(searchKeyword.value);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyboard);
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
});
</script>

<template>
  <div class="home-view">
    <Teleport to="#site-header-search">
      <label class="header-search-field" aria-label="Search curations">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M10.5 4a6.5 6.5 0 1 0 4.01 11.62l4.43 4.43 1.06-1.06-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 1.5A5 5 0 1 1 5.5 10.5a5 5 0 0 1 5-5Z"
          />
        </svg>
        <input
          :value="searchInput"
          type="search"
          placeholder="Search curations..."
          @input="onSearchInput"
        />
        <button
          v-if="searchInput"
          type="button"
          class="search-clear"
          @click="clearSearch"
        >
          Clear
        </button>
      </label>
    </Teleport>

    <section class="filter-strip">
      <div class="filter-headline">
        <span class="filter-kicker">Filter By Collection</span>
        <p class="filter-copy">
          保留现有分类能力，同时让筛选和浏览更像在看一套策展目录。
        </p>
      </div>

      <div class="chip-cluster">
        <button
          v-for="item in categoryOptions"
          :key="item.value"
          type="button"
          class="filter-chip"
          :class="{ 'is-active': activeCategory === item.value }"
          @click="handleCategoryChange(item.value)"
        >
          <span>{{ item.label }}</span>
          <span class="chip-count">{{ item.count }}</span>
        </button>
      </div>

      <div class="refine-strip">
        <div class="chip-cluster chip-cluster-subtle">
          <button
            v-for="item in sortCatalog"
            :key="item.value"
            type="button"
            class="filter-chip filter-chip-subtle"
            :class="{ 'is-active': sortOption === item.value }"
            @click="sortOption = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <div class="chip-cluster chip-cluster-subtle">
          <button
            v-for="item in densityCatalog"
            :key="item.value"
            type="button"
            class="filter-chip filter-chip-subtle"
            :class="{ 'is-active': density === item.value }"
            @click="density = item.value"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="!isLoading && wallpapers.length > 0" class="curator-note">
      <div class="note-copy">
        <span class="note-kicker">Curated Archive</span>
        <p>{{ filteredWallpapers.length }} 幅作品 · {{ filterSummary }}</p>
      </div>

      <div class="note-actions">
        <button type="button" class="note-action" @click="pickRandomWallpaper">
          Random Pick
        </button>
        <button
          v-if="continueWallpaper"
          type="button"
          class="note-action"
          @click="resumeLastViewed"
        >
          Continue
        </button>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="note-action"
          @click="resetFilters"
        >
          Reset
        </button>
      </div>
    </section>

    <section v-if="isLoading" class="loading-block gallery-state">
      <t-loading text="正在整理画廊..." />
    </section>

    <section
      v-else-if="wallpapers.length === 0"
      class="empty-block gallery-state"
    >
      还没有可展示的壁纸，先去上传一些作品吧。
    </section>

    <section
      v-else-if="filteredWallpapers.length === 0"
      class="empty-block gallery-state"
    >
      当前筛选条件下没有结果，换个关键词或切回更宽松的筛选试试。
    </section>

    <section v-else class="gallery-section">
      <div
        class="gallery-grid"
        :class="{ 'is-compact': density === 'compact' }"
      >
        <article
          v-for="wallpaper in pagedWallpapers"
          :key="wallpaper.id"
          class="gallery-card"
        >
          <button
            type="button"
            class="gallery-media"
            @click="onOpenModal(wallpaper)"
          >
            <img
              :src="wallpaper.thumbnailUrl"
              :alt="wallpaper.fileName"
              loading="lazy"
            />
            <span class="media-sheen"></span>
            <span class="media-overlay">
              <span class="media-title">{{
                formatWallpaperTitle(wallpaper.fileName)
              }}</span>
              <span class="media-subtitle">
                {{ getCategoryLabel(wallpaper.category) }} ·
                {{ formatRelativeTime(wallpaper.uploadTime) }}
              </span>
            </span>
          </button>
        </article>
      </div>

      <div v-if="totalPages > 1" class="pagination-wrap">
        <button
          type="button"
          class="pagination-link"
          :disabled="currentPage === 1"
          @click="handleCurrentChange(currentPage - 1)"
        >
          Previous
        </button>

        <div class="pagination-pages">
          <template v-for="item in paginationItems" :key="item.key">
            <span v-if="item.type === 'ellipsis'" class="pagination-ellipsis">
              ...
            </span>
            <button
              v-else
              type="button"
              class="pagination-page"
              :class="{ 'is-active': currentPage === item.value }"
              @click="handleCurrentChange(item.value || 1)"
            >
              {{ item.value }}
            </button>
          </template>
        </div>

        <button
          type="button"
          class="pagination-link"
          :disabled="currentPage === totalPages"
          @click="handleCurrentChange(currentPage + 1)"
        >
          Next
        </button>
      </div>
    </section>

    <section v-if="recentWallpapers.length > 0" class="recent-ribbon">
      <span class="recent-label">Recently Viewed</span>
      <div class="recent-list">
        <button
          v-for="wallpaper in recentWallpapers"
          :key="wallpaper.id"
          type="button"
          class="recent-item"
          @click="onOpenModal(wallpaper)"
        >
          {{ formatWallpaperTitle(wallpaper.fileName) }}
        </button>
      </div>
    </section>

    <t-dialog
      :visible="dialogVisible"
      attach="body"
      class="wallpaper-dialog"
      width="min(92vw, 1380px)"
      top="4vh"
      header=""
      @close="onCloseDialog"
    >
      <div v-if="currentWallpaper" class="dialog-shell">
        <div class="dialog-image-wrap">
          <img
            :src="currentWallpaper.originalUrl"
            :alt="currentWallpaper.fileName"
            class="dialog-image"
          />
        </div>

        <aside class="dialog-sidebar">
          <span class="dialog-kicker">{{
            getCategoryLabel(currentWallpaper.category)
          }}</span>
          <h2 class="dialog-title">
            {{ formatWallpaperTitle(currentWallpaper.fileName) }}
          </h2>
          <p class="dialog-copy">
            上传于 {{ formatDateTime(currentWallpaper.uploadTime) }}，文件大小
            {{ formatFileSize(currentWallpaper.fileSize) }}。
          </p>

          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-action dialog-action-primary"
              @click="downloadCurrentWallpaper"
            >
              下载原图
            </button>
            <button
              type="button"
              class="dialog-action"
              :disabled="!canGoPrev"
              @click="openByIndex(currentWallpaperIndex - 1)"
            >
              上一张
            </button>
            <button
              type="button"
              class="dialog-action"
              :disabled="!canGoNext"
              @click="openByIndex(currentWallpaperIndex + 1)"
            >
              下一张
            </button>
          </div>
        </aside>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <span>Esc 关闭 · ← → 切换</span>
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<style scoped>
.home-view {
  display: grid;
  gap: 24px;
  padding-bottom: 28px;
}

.header-search-field {
  width: min(100%, 420px);
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-radius: 999px;
  background: #d7e5eb;
  box-shadow: inset 0 0 0 1px rgba(167, 180, 186, 0.06);
  transition:
    background-color 0.22s ease,
    box-shadow 0.22s ease;
}

.header-search-field:focus-within {
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(40, 52, 57, 0.08);
}

.header-search-field svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  fill: var(--color-primary);
}

.header-search-field input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
}

.header-search-field input::placeholder {
  color: rgba(84, 97, 102, 0.68);
}

.search-clear {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.84rem;
  font-weight: 600;
}

.filter-strip {
  display: grid;
  gap: 20px;
  padding: 10px 2px 0;
}

.filter-headline {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.filter-kicker {
  color: var(--text-secondary);
  font-family: var(--font-display);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.filter-copy {
  color: var(--text-tertiary);
  font-size: 0.94rem;
  line-height: 1.6;
}

.chip-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.chip-cluster-subtle {
  gap: 10px;
}

.filter-chip {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: #dfeaef;
  color: var(--text-secondary);
  font-size: 0.92rem;
  font-weight: 600;
  transition:
    transform 0.22s ease,
    background-color 0.22s ease,
    color 0.22s ease,
    box-shadow 0.22s ease;
}

.filter-chip:hover {
  transform: translateY(-1px);
  background: #d7e5eb;
  color: var(--text-primary);
}

.filter-chip.is-active {
  color: #f7f7ff;
  background: var(--signature-gradient);
  box-shadow: 0 14px 26px rgba(76, 82, 96, 0.16);
}

.filter-chip-subtle {
  min-height: 42px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 0 0 1px rgba(167, 180, 186, 0.16);
}

.filter-chip-subtle.is-active {
  color: var(--text-primary);
  background: #ffffff;
  box-shadow:
    inset 0 0 0 1px rgba(167, 180, 186, 0.18),
    0 12px 24px rgba(40, 52, 57, 0.06);
}

.chip-count {
  min-width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
  font-size: 0.78rem;
  font-weight: 700;
}

.refine-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.curator-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 22px;
  border-radius: 22px;
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.92),
      rgba(239, 244, 247, 0.88)
    ),
    rgba(255, 255, 255, 0.6);
  box-shadow: 0 18px 40px rgba(40, 52, 57, 0.04);
}

.note-copy {
  display: grid;
  gap: 6px;
}

.note-kicker {
  color: var(--text-tertiary);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.note-copy p {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.note-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.note-action {
  min-height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 0 0 1px rgba(167, 180, 186, 0.18);
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  transition:
    transform 0.22s ease,
    color 0.22s ease,
    background-color 0.22s ease;
}

.note-action:hover {
  transform: translateY(-1px);
  color: var(--text-primary);
  background: #ffffff;
}

.gallery-state {
  min-height: 320px;
  border: 0;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.68);
}

.gallery-section {
  display: grid;
  gap: 26px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 22px;
}

.gallery-grid.is-compact {
  gap: 16px;
}

.gallery-card {
  min-width: 0;
}

.gallery-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: 18px;
  overflow: hidden;
  background: var(--bg-white);
  box-shadow: 0 12px 30px rgba(40, 52, 57, 0.04);
}

.gallery-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.9s ease;
}

.gallery-media:hover img {
  transform: scale(1.05);
}

.media-sheen {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 34%),
    linear-gradient(0deg, rgba(17, 24, 39, 0.58), transparent 48%);
  opacity: 0;
  transition: opacity 0.28s ease;
}

.gallery-media:hover .media-sheen,
.gallery-media:hover .media-overlay {
  opacity: 1;
}

.media-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  gap: 3px;
  padding: 18px;
  opacity: 0;
  transition: opacity 0.28s ease;
  text-align: left;
}

.media-title {
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.media-subtitle {
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.84rem;
}

.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 8px 0 0;
}

.pagination-link,
.pagination-page {
  min-width: 42px;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  transition:
    transform 0.22s ease,
    color 0.22s ease,
    background-color 0.22s ease;
}

.pagination-link:hover:not(:disabled),
.pagination-page:hover:not(:disabled) {
  transform: translateY(-1px);
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.72);
}

.pagination-page.is-active {
  color: #f7f7ff;
  background: var(--signature-gradient);
}

.pagination-link:disabled,
.pagination-page:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-ellipsis {
  color: var(--text-tertiary);
  font-family: var(--font-display);
  padding: 0 4px;
}

.recent-ribbon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 18px 22px;
  border-radius: 22px;
  background: rgba(239, 244, 247, 0.86);
}

.recent-label {
  color: var(--text-secondary);
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.recent-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.recent-item {
  min-height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 600;
  transition:
    transform 0.22s ease,
    color 0.22s ease,
    background-color 0.22s ease;
}

.recent-item:hover {
  transform: translateY(-1px);
  color: var(--text-primary);
  background: #ffffff;
}

.dialog-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 24px;
  align-items: start;
}

.dialog-image-wrap {
  border-radius: 22px;
  overflow: hidden;
  background: rgba(239, 244, 247, 0.72);
}

.dialog-image {
  width: 100%;
  max-height: 78vh;
  object-fit: contain;
}

.dialog-sidebar {
  display: grid;
  gap: 14px;
  padding-top: 6px;
}

.dialog-kicker {
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.dialog-title {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 2.3vw, 2.3rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.dialog-copy {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.7;
}

.dialog-actions {
  display: grid;
  gap: 10px;
  margin-top: 6px;
}

.dialog-action {
  min-height: 46px;
  padding: 0 18px;
  border: 0;
  border-radius: 14px;
  background: rgba(239, 244, 247, 0.88);
  color: var(--text-primary);
  font-size: 0.92rem;
  font-weight: 600;
  transition:
    transform 0.22s ease,
    opacity 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease;
}

.dialog-action:hover:not(:disabled) {
  transform: translateY(-1px);
}

.dialog-action:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.dialog-action-primary {
  color: #f7f7ff;
  background: var(--signature-gradient);
  box-shadow: 0 16px 30px rgba(76, 82, 96, 0.16);
}

.dialog-footer {
  color: var(--text-tertiary);
  font-size: 0.84rem;
}

:deep(.wallpaper-dialog .t-dialog__header) {
  display: none;
}

:deep(.wallpaper-dialog .t-dialog__body) {
  padding-top: 0;
}

@media (max-width: 1180px) {
  .gallery-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dialog-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .curator-note,
  .recent-ribbon {
    padding: 16px 18px;
  }
}

@media (max-width: 620px) {
  .home-view {
    gap: 18px;
  }

  .header-search-field {
    width: 100%;
  }

  .filter-copy {
    font-size: 0.88rem;
  }

  .gallery-grid {
    grid-template-columns: 1fr;
  }

  .pagination-wrap {
    gap: 12px;
  }

  .pagination-link {
    padding: 0 10px;
  }
}
</style>
