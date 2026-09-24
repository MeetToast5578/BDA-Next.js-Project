'use client'

import { useState } from 'react'

import { postJson } from '@/lib/api-client'

export function LogoutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)
    // Independent: Payload ends its own session, the second clears the Google session cookie.
    await Promise.all([
      postJson('/api/users/logout').catch(() => null),
      postJson('/api/auth/logout').catch(() => null),
    ])
    // A full page load rather than a client-side navigation: it drops everything the router holds
    // from the signed-in session at once, including prefetched sign-in-only pages and the
    // browser-cached session (`use cache: private` in lib/session.ts). The button stays pending
    // until the new page replaces this one.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the full load is the point
    window.location.assign('/')
  }

  return (
    <button type="button" className={className} onClick={logout} disabled={pending}>
      {pending ? 'Çıxılır…' : 'Çıxış'}
    </button>
  )
}
