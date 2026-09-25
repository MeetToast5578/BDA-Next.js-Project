'use server'

import { updateTag } from 'next/cache'
import { headers } from 'next/headers'

import { getPayloadClient } from '@/lib/game-queries'
import { sessionTag } from '@/lib/session'

/**
 * Expires the signed-in user's cached session (`getCurrentUser`), so the header and the forms that
 * prefill from the profile show a change at once rather than minutes later. Call it after anything
 * that changes the profile. A Server Action because only one can `updateTag`, and the response
 * re-renders the current page with the fresh session. The session is re-read here, not taken from
 * the caller, so nobody can expire someone else's.
 */
export async function expireSession() {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (user) updateTag(sessionTag(Number(user.id)))
}
