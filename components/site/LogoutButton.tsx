'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { postJson } from '@/lib/api-client'

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)
    try {
      // Independent: Payload ends its own session, the second clears the Google session cookie.
      await Promise.all([
        postJson('/api/users/logout').catch(() => null),
        postJson('/api/auth/logout').catch(() => null),
      ])
      // Navigate rather than only refreshing in place: on a page that redirects signed-out visitors
      // (/games/new), a refresh has to be turned into a navigation by the server redirect, which is
      // what used to leave the page sitting there still showing a signed-in header.
      router.replace('/')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button type="button" className={className} onClick={logout} disabled={pending}>
      {pending ? 'Çıxılır…' : 'Çıxış'}
    </button>
  )
}
