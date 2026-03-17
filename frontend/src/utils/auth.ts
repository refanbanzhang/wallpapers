import { computed, ref } from 'vue'

const AUTH_TOKEN_KEY = 'wallpaper_admin_token'

interface AuthTokenPayload {
  role?: string
}

const readStoredToken = () => {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || ''
}

const decodeTokenPayload = (token: string): AuthTokenPayload | null => {
  if (!token || typeof window === 'undefined') {
    return null
  }

  const [encodedPayload] = token.split('.')
  if (!encodedPayload) {
    return null
  }

  try {
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = window.atob(padded)
    const payload = JSON.parse(json)
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

const tokenRef = ref(readStoredToken())

export const isAuthenticated = computed(() => Boolean(tokenRef.value))
export const hasManagePermission = computed(
  () => decodeTokenPayload(tokenRef.value)?.role === 'admin',
)

export const getAuthToken = () => tokenRef.value

export const setAuthToken = (token: string) => {
  tokenRef.value = token

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  }
}

export const clearAuthToken = () => {
  tokenRef.value = ''

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}
