/** Returns `next` if it is a same-site path ("/games/12"), else `fallback`. Blocks "//evil.com" and "/\evil.com". */
export function safeRedirectPath(next: unknown, fallback = '/') {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback
  }
  return next
}

export function loginHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`
}
