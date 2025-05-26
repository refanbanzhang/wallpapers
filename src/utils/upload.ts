// 删除未使用的import
//import { base64ToBlob } from './image'

interface UploadResult {
  originalUrl: string
  thumbnailUrl: string
  fileName: string
  fileSize: number
}

/**
 * 将图片上传到服务器
 * @param options 上传选项
 * @returns 上传结果
 */
export const uploadImage = async ({
  file,
  generateThumbnail = true,
}: {
  file: File;
  generateThumbnail?: boolean;
}): Promise<UploadResult> => {
  try {
    // 创建FormData
    const formData = new FormData()
    formData.append('image', file)

    // 添加是否生成缩略图的标记
    formData.append('generateThumbnail', generateThumbnail.toString())

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
 * 批量删除图片
 * @param ids 图片ID数组
 */
export const deleteMultipleImages = async (ids: string[]) => {
  try {
    const response = await fetch(`/api/images/batch-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })

    if (!response.ok) {
      throw new Error('批量删除图片失败')
    }

    return await response.json()
  } catch (error) {
    console.error('批量删除图片失败:', error)
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
