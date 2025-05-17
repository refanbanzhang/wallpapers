import { base64ToBlob } from './image'

interface UploadResult {
  originalUrl: string
  thumbnailUrl: string
  fileName: string
  fileSize: number
}

/**
 * 将base64图片上传到服务器
 * @param originalBase64 原图的base64
 * @param thumbnailBase64 缩略图的base64
 * @param fileName 文件名
 * @returns 上传结果
 */
export const uploadImages = async (
  originalBase64: string,
  thumbnailBase64: string,
  fileName: string,
): Promise<UploadResult> => {
  try {
    // 转换base64为Blob对象
    const originalBlob = base64ToBlob(originalBase64)
    const thumbnailBlob = base64ToBlob(thumbnailBase64)

    // 确保文件名安全
    const safeFileName = encodeURIComponent(fileName)

    // 创建FormData
    const formData = new FormData()
    formData.append('original', originalBlob, safeFileName)
    formData.append('thumbnail', thumbnailBlob, `thumb_${safeFileName}`)
    formData.append('fileName', fileName) // 原始文件名用于显示

    // 发送请求
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '上传失败')
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('上传图片失败:', error)
    throw error
  }
}

/**
 * 获取已上传的图片列表
 */
export const getUploadedImages = async () => {
  try {
    const response = await fetch('/api/images')
    if (!response.ok) {
      throw new Error('获取图片列表失败')
    }
    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('获取图片列表失败:', error)
    throw error
  }
}

/**
 * 删除图片
 * @param id 图片ID
 */
export const deleteImage = async (id: string) => {
  try {
    const response = await fetch(`/api/images/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('删除图片失败')
    }

    return await response.json()
  } catch (error) {
    console.error('删除图片失败:', error)
    throw error
  }
}

/**
 * 格式化文件大小
 * @param size 文件大小（字节）
 * @returns 格式化的文件大小字符串
 */
export const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return size + ' B'
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB'
  } else {
    return (size / (1024 * 1024)).toFixed(2) + ' MB'
  }
}
