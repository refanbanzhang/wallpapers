import { computed, ref } from 'vue'

const AUTH_TOKEN_KEY = 'wallpaper_admin_token'

const readStoredToken = () => {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || ''
}

const tokenRef = ref(readStoredToken())

export const isAuthenticated = computed(() => Boolean(tokenRef.value))

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
