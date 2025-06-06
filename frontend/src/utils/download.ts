/**
 * 壁纸下载工具函数
 */

interface DownloadOptions {
  url: string
  filename: string
  extension?: string
}

/**
 * 下载图片函数
 * @param options 下载选项
 * @returns Promise<void>
 */
export const downloadImage = async (options: DownloadOptions): Promise<void> => {
  const { url, filename, extension = 'jpg' } = options

  if (!url) {
    throw new Error('下载URL不能为空')
  }

  try {
    // 使用fetch获取图片数据
    const response = await fetch(url)
    const blob = await response.blob()

    // 创建临时URL
    const objectURL = URL.createObjectURL(blob)

    // 创建a标签来下载
    const link = document.createElement('a')
    link.href = objectURL
    link.download = `${filename}.${extension}`
    document.body.appendChild(link)
    link.click()

    // 清理
    document.body.removeChild(link)
    URL.revokeObjectURL(objectURL)
  } catch (error) {
    console.error('下载失败', error)
    throw error
  }
}

/**
 * 下载壁纸
 * @param imageUrl 图片URL
 * @param name 图片名称
 * @returns Promise<void>
 */
export const downloadWallpaper = async (imageUrl: string, name: string): Promise<void> => {
  return downloadImage({
    url: imageUrl,
    filename: name,
  })
}
