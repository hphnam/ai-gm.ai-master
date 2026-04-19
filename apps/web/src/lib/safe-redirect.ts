export function isSafeRedirect(target: string | null | undefined): target is string {
  if (!target || typeof target !== 'string') return false
  if (target.length > 512) return false
  if (/[\r\n\0]/.test(target)) return false
  if (target.startsWith('//')) return false
  if (!target.startsWith('/')) return false
  if (target.startsWith('/auth/')) return false
  if (/^\/[^a-z0-9/\-?#=&._~%@:+,;!*'()[\]]/i.test(target)) return false
  return true
}

export function safeRedirectOr(target: string | null | undefined, fallback = '/chat'): string {
  return isSafeRedirect(target) ? target : fallback
}
