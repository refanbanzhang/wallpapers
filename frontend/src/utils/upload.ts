/**
 * 格式化文件大小
 * @param size 文件大小（字节）
 * @returns 格式化的文件大小字符串
 */
export const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}
