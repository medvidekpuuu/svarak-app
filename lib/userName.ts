const KEY = 'userName'

export function getStoredUserName(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(KEY)
}

export function setStoredUserName(name: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, name)
}

export function clearStoredUserName() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(KEY)
}

