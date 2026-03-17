<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

import { getAnalyticsSummary, type AnalyticsSummary } from '@/api/index'

const loading = ref(false)
const summary = ref<AnalyticsSummary | null>(null)

const metricCards = computed(() => {
  if (!summary.value) {
    return []
  }

  const { overview } = summary.value
  return [
    { label: '今日 PV', value: overview.pvToday.toLocaleString(), hint: '页面访问总量' },
    { label: '今日 UV', value: overview.uvToday.toLocaleString(), hint: '去重访客数' },
    { label: '平均访问深度', value: overview.avgPvPerVisitor.toFixed(2), hint: 'PV / UV' },
    {
      label: '单页访客占比',
      value: `${(overview.singleVisitVisitorRate * 100).toFixed(1)}%`,
      hint: '近似跳出率指标',
    },
    { label: '今日路径数', value: overview.uniquePathsToday.toLocaleString(), hint: '被访问页面数量' },
    { label: '累计 PV', value: overview.totalPv.toLocaleString(), hint: '服务启动以来' },
  ]
})

const maxDailyPv = computed(() => {
  const values = summary.value?.dailyTrend.map((item) => item.pv) || []
  const max = Math.max(0, ...values)
  return max || 1
})

const maxPathPv = computed(() => {
  const values = summary.value?.topPaths.map((item) => item.pv) || []
  const max = Math.max(0, ...values)
  return max || 1
})

const maxHourlyPv = computed(() => {
  const values = summary.value?.hourlyPv.map((item) => item.pv) || []
  const max = Math.max(0, ...values)
  return max || 1
})

const formatDayLabel = (day: string) => {
  const date = new Date(day)
  if (Number.isNaN(date.getTime())) {
    return day
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const fetchSummary = async () => {
  try {
    loading.value = true
    summary.value = await getAnalyticsSummary()
  } catch (error) {
    console.error('获取统计数据失败:', error)
    MessagePlugin.error(error instanceof Error ? error.message : '获取统计数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSummary()
})
</script>

<template>
  <div class="page-container dashboard-view">
    <section class="hero">
      <div class="page-copy">
        <span class="badge">ADMIN ANALYTICS</span>
        <h1 class="page-title">访问数据仪表盘</h1>
        <p class="page-description">
          追踪无登录场景下的访问趋势，结合 PV、UV、路径热度和小时分布判断内容活跃时段。
        </p>
      </div>
      <button
        type="button"
        class="refresh-btn"
        :disabled="loading"
        @click="fetchSummary"
      >
        {{ loading ? '刷新中...' : '刷新数据' }}
      </button>
    </section>

    <section
      v-if="loading && !summary"
      class="loading-block"
    >
      正在加载仪表盘数据...
    </section>

    <template v-else-if="summary">
      <section class="metrics-grid">
        <article
          v-for="item in metricCards"
          :key="item.label"
          class="card metric-card"
        >
          <p class="metric-label">{{ item.label }}</p>
          <p class="metric-value">{{ item.value }}</p>
          <p class="metric-hint">{{ item.hint }}</p>
        </article>
      </section>

      <section class="chart-grid">
        <article class="card trend-card">
          <h2 class="section-title">近 7 天趋势</h2>
          <div class="trend-bars">
            <div
              v-for="point in summary.dailyTrend"
              :key="point.day"
              class="trend-item"
            >
              <div class="bar-stack">
                <div
                  class="bar pv"
                  :style="{ height: `${Math.max(6, (point.pv / maxDailyPv) * 110)}px` }"
                />
                <div
                  class="bar uv"
                  :style="{ height: `${Math.max(6, (point.uv / maxDailyPv) * 110)}px` }"
                />
              </div>
              <p class="bar-label">{{ formatDayLabel(point.day) }}</p>
            </div>
          </div>
          <p class="legend">
            <span class="legend-dot pv" /> PV
            <span class="legend-dot uv" /> UV
          </p>
        </article>

        <article class="card top-path-card">
          <h2 class="section-title">今日 Top 页面</h2>
          <p
            v-if="summary.topPaths.length === 0"
            class="empty-note"
          >
            还没有路径访问数据
          </p>
          <ul
            v-else
            class="path-list"
          >
            <li
              v-for="item in summary.topPaths"
              :key="item.path"
              class="path-item"
            >
              <div class="path-head">
                <span class="path-name">{{ item.path }}</span>
                <span class="path-value">{{ item.pv }}</span>
              </div>
              <div class="path-track">
                <div
                  class="path-fill"
                  :style="{ width: `${(item.pv / maxPathPv) * 100}%` }"
                />
              </div>
            </li>
          </ul>
        </article>
      </section>

      <section class="card hourly-card">
        <h2 class="section-title">今日 24 小时访问分布</h2>
        <div class="hourly-grid">
          <div
            v-for="point in summary.hourlyPv"
            :key="point.hour"
            class="hour-cell"
            :style="{ opacity: 0.2 + (point.pv / maxHourlyPv) * 0.8 }"
          >
            <span class="hour-label">{{ point.hour }}</span>
            <span class="hour-value">{{ point.pv }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: grid;
  gap: 20px;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: clamp(18px, 2.4vw, 26px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: linear-gradient(145deg, #f6f6f6 0%, #ffffff 100%);
}

.refresh-btn {
  min-height: 42px;
  min-width: 118px;
  padding: 8px 14px;
  border: 1px solid #232323;
  border-radius: 999px;
  background: #232323;
  color: #ffffff;
  font-weight: 600;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #3c3c3c;
}

.refresh-btn:disabled {
  opacity: 0.72;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  display: grid;
  gap: 6px;
}

.metric-label {
  color: var(--text-secondary);
  font-size: 13px;
}

.metric-value {
  margin: 0;
  font-size: clamp(26px, 3vw, 34px);
  line-height: 1.12;
  font-weight: 700;
  color: var(--text-primary);
}

.metric-hint {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 12px;
}

.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 14px;
}

.trend-bars {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.trend-item {
  display: grid;
  justify-items: center;
  gap: 7px;
}

.bar-stack {
  min-height: 118px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.bar {
  width: 11px;
  border-radius: 999px 999px 3px 3px;
}

.bar.pv {
  background: #111111;
}

.bar.uv {
  background: #9b9b9b;
}

.bar-label {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-right: 5px;
}

.legend-dot.pv {
  background: #111111;
}

.legend-dot.uv {
  background: #9b9b9b;
}

.path-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.path-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.path-name {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.path-value {
  color: var(--text-secondary);
  font-size: 13px;
}

.path-track {
  margin-top: 6px;
  height: 8px;
  border-radius: 999px;
  background: #f0f0f0;
  overflow: hidden;
}

.path-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1f1f1f, #7c7c7c);
}

.hourly-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 8px;
}

.hour-cell {
  min-height: 46px;
  border-radius: 8px;
  border: 1px solid #e2e2e2;
  background: #1f1f1f;
  color: #ffffff;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 2px;
}

.hour-label {
  font-size: 11px;
}

.hour-value {
  font-size: 12px;
  font-weight: 700;
}

.empty-note {
  color: var(--text-secondary);
  margin: 0;
}

@media (max-width: 980px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }

  .hourly-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .hero {
    flex-direction: column;
  }

  .refresh-btn {
    width: 100%;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .hourly-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
</style>
