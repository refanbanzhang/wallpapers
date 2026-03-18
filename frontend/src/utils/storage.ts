export const readStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const writeStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

export const removeStorage = (key: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(key)
}

export const readStorageString = (key: string, fallback = '') => {
  if (typeof window === 'undefined') {
    return fallback
  }

  return window.localStorage.getItem(key) || fallback
}

export const writeStorageString = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, value)
}
