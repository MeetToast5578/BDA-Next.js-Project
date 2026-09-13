import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { getGameDetail, getPayloadClient } from '@/lib/game-queries'

/** "Oyun Detalı". Signing in is optional; it only affects `viewer` and whether the host's phone is shown. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gameId = Number((await params).id)
  if (!Number.isSafeInteger(gameId) || gameId <= 0) return apiError('INVALID_GAME_ID', 'Oyun ID-si yanlışdır.', 400)

  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: request.headers })
    const game = await getGameDetail(gameId, user ? Number(user.id) : null)
    return game ? NextResponse.json(game) : apiError('GAME_NOT_FOUND', 'Oyun tapılmadı.', 404)
  } catch (error) {
    console.error(error)
    return apiError('INTERNAL_ERROR', 'Oyunu yükləmək mümkün olmadı.', 500)
  }
}
