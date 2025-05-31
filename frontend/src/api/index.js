const host = 'http://localhost:3000'

/**
 * 获取图片列表
 * @returns {Promise<Object>} 图片列表
 */
export const getImages = async () => {
  const response = await fetch(`${host}/api/images`)
  const data = await response.json()
  return data.data.map(item => ({
    ...item,
    id: item._id
  }))
}

/**
 * 上传图片到服务器
 * @param {string} fileContent base64字符串（不带data:image前缀）
 * @param {string} fileName 文件名（如 xxx.jpg）
 * @returns {Promise<Object>} 上传结果
 */
export const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${host}/api/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json()
  return data.data
}

export const removeImage = async (id) => {
  const response = await fetch(`${host}/api/images/${id}`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
  const data = await response.json()
  return data.data
}

export default {
  getImages,
  uploadImage,
  removeImage,
}