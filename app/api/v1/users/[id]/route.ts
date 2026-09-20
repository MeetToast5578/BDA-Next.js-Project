import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { getPublicProfile } from '@/lib/profile-queries'

/**
 * Another player's public profile, for linking a host's name somewhere. Open to anyone: it carries
 * only what a game card already shows about its host, plus the games they are running. Their email
 * and phone are never included — the host's number stays gated behind joining the game.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = Number((await params).id)
  if (!Number.isSafeInteger(userId) || userId <= 0) return apiError('INVALID_USER_ID', 'İstifadəçi ID-si yanlışdır.', 400)

  try {
    const profile = await getPublicProfile(userId)
    return profile ? NextResponse.json(profile) : apiError('USER_NOT_FOUND', 'İstifadəçi tapılmadı.', 404)
  } catch (error) {
    console.error(error)
    return apiError('INTERNAL_ERROR', 'Profili yükləmək mümkün olmadı.', 500)
  }
}
