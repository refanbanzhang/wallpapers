import type { ImageItem } from '@/api/index'
import { getAuthToken } from '@/utils/auth'

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

const buildUrl = (path: string) => `${apiBase}${path}`

export const routeLabels: Record<string, string> = {
  '/': '首页',
  '/manage': '图片管理',
  '/dashboard': '数据仪表盘',
  '/about': '关于',
  '/login': '登录',
}

export const getRouteLabel = (path: string) => {
  const normalizedPath = path.split('?')[0]
  return routeLabels[normalizedPath] || '页面'
}

export const formatRelativeTime = (value: string | number | Date, now = Date.now()) => {
  const date = value instanceof Date ? value : new Date(value)
  const timestamp = date.getTime()

  if (Number.isNaN(timestamp)) {
    return ''
  }

  const diff = now - timestamp
  const absDiff = Math.abs(diff)
  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return diff >= 0 ? '刚刚' : '即将到来'
  }

  if (minutes < 60) {
    return diff >= 0 ? `${minutes} 分钟前` : `${minutes} 分钟后`
  }

  if (hours < 24) {
    return diff >= 0 ? `${hours} 小时前` : `${hours} 小时后`
  }

  if (days < 7) {
    return diff >= 0 ? `${days} 天前` : `${days} 天后`
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export const formatDateTime = (value: string | number | Date) => {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export const uploadImageWithProgress = (
  file: Blob,
  category = '',
  onProgress?: (progress: number) => void,
): Promise<ImageItem> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('当前环境不支持上传'))
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open('POST', buildUrl('/api/images/upload'))

    const token = getAuthToken()
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return
      }

      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }

    xhr.onload = () => {
      let payload: { success?: boolean; data?: ImageItem; error?: string; message?: string } = {}

      try {
        payload = xhr.responseText ? (JSON.parse(xhr.responseText) as typeof payload) : {}
      } catch {
        reject(new Error('上传结果解析失败'))
        return
      }

      if (xhr.status < 200 || xhr.status >= 300 || payload.success === false) {
        reject(new Error(payload.error || payload.message || `请求失败 (${xhr.status})`))
        return
      }

      if (!payload.data) {
        reject(new Error('上传成功，但未返回文件信息'))
        return
      }

      resolve(payload.data)
    }

    xhr.onerror = () => {
      reject(new Error('网络异常，上传失败'))
    }

    const formData = new FormData()
    formData.append('file', file)
    if (category) {
      formData.append('category', category)
    }

    xhr.send(formData)
  })
}
