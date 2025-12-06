const KEY = 'svarak_user_name'

export function getStoredUserName(): string | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(KEY)
  if (!value) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function setStoredUserName(name: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, name)
}

