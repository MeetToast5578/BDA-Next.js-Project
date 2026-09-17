import 'server-only'

import { headers } from 'next/headers'
import { cache } from 'react'

import type { CurrentUser } from '@/lib/api-types'
import { initialsOf } from '@/lib/game-backend'
import { getPayloadClient } from '@/lib/game-queries'

/**
 * The signed-in user (Payload session or Google session cookie), or null.
 * Cached per request so the header and the page share one lookup.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || user.collection !== 'users') return null

  const fullName = user.fullName?.trim() || user.email
  return {
    id: Number(user.id),
    fullName,
    firstName: fullName.split(/\s+/)[0],
    initials: initialsOf(fullName),
    email: user.email,
    phoneNumber: user.phoneNumber ?? null,
  }
})

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CALLBACK_URL)
}
