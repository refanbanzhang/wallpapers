const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

const buildUrl = (path: string) => `${apiBase}${path}`

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.success === false) {
    const message = payload.error || payload.message || `请求失败 (${response.status})`
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

export const updateImageCategory = async (id: string, category: string) => {
  return request(buildUrl(`/api/images/${id}/category`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category }),
  })
}

export default {
  getImages,
  uploadImage,
  removeImage,
  updateImageCategory,
}
