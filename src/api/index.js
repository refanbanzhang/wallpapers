const host = 'https://fc-mp-901c2eda-ac99-48e4-af67-19411b9d7eb7.next.bspapp.com'

/**
 * 获取图片列表
 * @returns {Promise<Object>} 图片列表
 */
export const getImages = async () => {
  const response = await fetch(`${host}/image/getImages`)
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
  // 使用FileReader读取文件并转换为base64
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Data = e.target.result.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const response = await fetch(`${host}/image/uploadImage`, {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileContent: base64,
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  const data = await response.json()
  return data.data
}

export const removeImage = async (id) => {
  const response = await fetch(`${host}/image/removeImage`, {
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