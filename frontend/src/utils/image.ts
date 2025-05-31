/**
 * 图片处理工具函数
 */

/**
 * 生成缩略图函数
 * @param file 原始图片文件
 * @param maxWidth 缩略图最大宽度
 * @param maxHeight 缩略图最大高度
 * @param quality 图片质量 0-1之间
 * @returns Promise<{ original: string, thumbnail: string }> 返回原图和缩略图的base64字符串
 */
export const generateThumbnail = async (
  file: File,
  maxWidth = 200,
  maxHeight = 200,
  quality = 0.7,
): Promise<{ original: string; thumbnail: string }> => {
  return new Promise((resolve, reject) => {
    // 将文件转换为base64
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (e) => {
      const originalBase64 = e.target?.result as string

      // 创建图片对象加载原图
      const img = new Image()
      img.onload = () => {
        // 计算缩放比例
        const width = img.width
        const height = img.height
        let ratio = 1

        if (width > height && width > maxWidth) {
          ratio = maxWidth / width
        } else if (height > width && height > maxHeight) {
          ratio = maxHeight / height
        }

        // 创建Canvas用于绘制缩略图
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(width * ratio)
        canvas.height = Math.floor(height * ratio)

        // 绘制缩略图
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建Canvas上下文'))
          return
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // 转换为base64
        const thumbnailBase64 = canvas.toDataURL('image/jpeg', quality)

        resolve({
          original: originalBase64,
          thumbnail: thumbnailBase64,
        })
      }

      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }

      img.src = originalBase64
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
  })
}

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 文件扩展名
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2)
}

/**
 * Base64转Blob对象
 * @param base64 base64字符串
 * @returns Blob对象
 */
export const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(';base64,')
  const contentType = parts[0].split(':')[1]
  const raw = window.atob(parts[1])
  const rawLength = raw.length

  const uInt8Array = new Uint8Array(rawLength)
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }

  return new Blob([uInt8Array], { type: contentType })
}

/**
 * 获取图片分辨率
 * @param imageUrl 图片URL
 * @returns Promise<{width: number, height: number}> 图片宽高
 */
export const getImageResolution = (
  imageUrl: string,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      })
    }

    img.onerror = () => {
      reject(new Error('获取图片分辨率失败'))
    }

    img.src = imageUrl
  })
}
