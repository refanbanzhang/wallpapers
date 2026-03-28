import { clearAuthToken, getAuthToken } from '@/utils/auth'
import { getOrCreateVisitorId } from '@/utils/visitor'

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

const buildUrl = (path: string) => `${apiBase}${path}`

const redirectToLogin = () => {
  if (typeof window === 'undefined') {
    return
  }

  if (window.location.pathname.startsWith('/login')) {
    return
  }

  const currentPath = `${window.location.pathname}${window.location.search}`
  window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
}

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers)
  const token = getAuthToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.success === false) {
    const message = payload.error || payload.message || `请求失败 (${response.status})`
    if (response.status === 401) {
      clearAuthToken()
      redirectToLogin()
    }
    throw new Error(message)
  }

  return payload.data as T
}

export interface ImageItem {
  id: string
  fileName: string
  originalUrl: string
  thumbnailUrl: string
  fileSize: number
  uploadTime: string
  category?: string | null
}

export interface CrawlPageSummary {
  pageUrl: string
  discoveredImages: number
  downloadedImages: number
}

export interface CrawledImageItem {
  sourceUrl: string
  originalFilename: string
  storedFilename: string
  fileSize: number
  originalUrl: string
  thumbnailUrl: string
}

export interface CrawlResult {
  startUrl: string
  category?: string | null
  delayMs: number
  pagesVisited: number
  imagesDownloaded: number
  imagesSkipped: number
  pageSummaries: CrawlPageSummary[]
  downloadedImages: CrawledImageItem[]
  skippedImages: Array<{ sourceUrl: string; reason: string }>
}

export interface LoginResult {
  token: string
  tokenType: 'Bearer'
  expiresIn: number
}

export const login = async (username: string, password: string): Promise<LoginResult> => {
  return request<LoginResult>(buildUrl('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
}

export const getImages = async (search = ''): Promise<ImageItem[]> => {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  return request<ImageItem[]>(buildUrl(`/api/images${query}`))
}

export const uploadImage = async (file: Blob, category = ''): Promise<ImageItem> => {
  const formData = new FormData()
  formData.append('file', file)

  if (category) {
    formData.append('category', category)
  }

  return request<ImageItem>(buildUrl('/api/images/upload'), {
    method: 'POST',
    body: formData,
  })
}

export const removeImage = async (id: string) => {
  return request(buildUrl(`/api/images/${id}`), {
    method: 'DELETE',
  })
}

export const crawlWebsiteImages = async (payload: {
  startUrl: string
  category?: string
  delayMs?: number
  maxPages?: number
  maxImages?: number
}): Promise<CrawlResult> => {
  return request<CrawlResult>(buildUrl('/api/images/crawl'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export const updateImageCategory = async (id: string, category: string) => {
  return request(buildUrl(`/api/images/${id}/category`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category }),
  })
}

export interface TrackVisitResult {
  day: string
  path: string
  pvToday: number
  uvToday: number
  pathPvToday: number
  totalPv: number
  isNewVisitorToday: boolean
}

export const trackVisit = async (path: string): Promise<TrackVisitResult> => {
  return request<TrackVisitResult>(buildUrl('/api/analytics/track'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      visitorId: getOrCreateVisitorId(),
    }),
  })
}

export interface AnalyticsOverview {
  pvToday: number
  uvToday: number
  totalPv: number
  avgPvPerVisitor: number
  singleVisitVisitorRate: number
  uniquePathsToday: number
}

export interface AnalyticsDailyPoint {
  day: string
  pv: number
  uv: number
}

export interface AnalyticsPathPoint {
  path: string
  pv: number
}

export interface AnalyticsHourPoint {
  hour: number
  pv: number
}

export interface AnalyticsSummary {
  overview: AnalyticsOverview
  dailyTrend: AnalyticsDailyPoint[]
  topPaths: AnalyticsPathPoint[]
  hourlyPv: AnalyticsHourPoint[]
}

export const getAnalyticsSummary = async (): Promise<AnalyticsSummary> => {
  return request<AnalyticsSummary>(buildUrl('/api/analytics/summary'))
}

export default {
  login,
  getImages,
  uploadImage,
  crawlWebsiteImages,
  removeImage,
  updateImageCategory,
  trackVisit,
  getAnalyticsSummary,
}
