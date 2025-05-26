const host = 'https://fc-mp-901c2eda-ac99-48e4-af67-19411b9d7eb7.next.bspapp.com'

export const getImages = async () => {
  const response = await fetch(`${host}/image/getImages`)
  const data = await response.json()
  return data.data
}

export default {
  getImages,
}