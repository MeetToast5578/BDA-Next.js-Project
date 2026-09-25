import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { getGamePlayers, getPayloadClient } from '@/lib/game-queries'

/**
 * "İştirakçılar": everyone in the game, for the list the avatar row opens. Public like the game
 * itself — the names and pictures are already on the avatar row, and each profile is public.
 * Signing in only marks your own row.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gameId = Number((await params).id)
  if (!Number.isSafeInteger(gameId) || gameId <= 0) return apiError('INVALID_GAME_ID', 'Oyun ID-si yanlışdır.', 400)

  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: request.headers })
    const players = await getGamePlayers(gameId, user ? Number(user.id) : null)
    return players ? NextResponse.json(players) : apiError('GAME_NOT_FOUND', 'Oyun tapılmadı.', 404)
  } catch (error) {
    console.error(error)
    return apiError('INTERNAL_ERROR', 'İştirakçıları yükləmək mümkün olmadı.', 500)
  }
}
