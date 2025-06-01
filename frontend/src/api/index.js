const host = ''

/**
 * 获取图片列表
 * @returns {Promise<Object>} 图片列表
 */
export const getImages = async () => {
  const response = await fetch(`${host}/api/images`)
  const data = await response.json()
  return data.data
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

  const response = await fetch(`${host}/api/images/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json()
  return data.data
}

export const removeImage = async (id) => {
  const response = await fetch(`${host}/api/images/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  const data = await response.json()
  return data.data
}

/**
 * 更新图片分类
 * @param {string} id 图片ID
 * @param {string} category 分类名称
 * @returns {Promise<Object>} 更新结果
 */
export const updateImageCategory = async (id, category) => {
  const response = await fetch(`${host}/api/images/${id}/category`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ category })
  })
  const data = await response.json()
  return data.data
}

export default {
  getImages,
  uploadImage,
  removeImage,
  updateImageCategory
}