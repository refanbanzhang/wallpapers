const VISITOR_ID_KEY = 'wallpaper_visitor_id'

const generateVisitorId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const random = Math.random().toString(36).slice(2, 10)
  return `visitor-${Date.now()}-${random}`
}

export const getOrCreateVisitorId = () => {
  if (typeof window === 'undefined') {
    return generateVisitorId()
  }

  const existing = window.localStorage.getItem(VISITOR_ID_KEY)
  if (existing) {
    return existing
  }

  const nextId = generateVisitorId()
  window.localStorage.setItem(VISITOR_ID_KEY, nextId)
  return nextId
}
