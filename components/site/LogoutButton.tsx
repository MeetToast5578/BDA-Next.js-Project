'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { postJson } from '@/lib/api-client'

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)
    // Payload ends its own session; the second call also clears the Google session cookie.
    await postJson('/api/users/logout').catch(() => null)
    await postJson('/api/auth/logout').catch(() => null)
    router.refresh()
    setPending(false)
  }

  return (
    <button type="button" className={className} onClick={logout} disabled={pending}>
      {pending ? 'Çıxılır…' : 'Çıxış'}
    </button>
  )
}
