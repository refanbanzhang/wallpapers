const host = ''

/**
 * 获取图片列表
 * @param {string} search 搜索关键词（可选）
 * @returns {Promise<Object>} 图片列表
 */
export const getImages = async (search = '') => {
  let url = `${host}/api/images`
  
  // 如果有搜索关键词，添加到查询参数
  if (search) {
    url += `?search=${encodeURIComponent(search)}`
  }
  
  const response = await fetch(url)
  const data = await response.json()
  return data.data
}

/**
 * 上传图片到服务器
 * @param {File} file 文件对象
 * @param {string} category 分类（可选）
 * @returns {Promise<Object>} 上传结果
 */
export const uploadImage = async (file, category = '') => {
  const formData = new FormData()
  formData.append('file', file)

  // 添加分类信息（如果有）
  if (category) {
    formData.append('category', category)
  }

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