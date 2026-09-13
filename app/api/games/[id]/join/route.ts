import { NextResponse } from 'next/server'

import { invalidateGamesCache } from '@/lib/cache-tags'
import { getPayloadClient } from '@/lib/game-queries'
import { claimSpot, recordJoinAttempt, type JoinErrorCode } from '@/lib/join-game'

const JOIN_ERRORS: Record<JoinErrorCode, { status: number; message: string }> = {
  GAME_NOT_FOUND: { status: 404, message: 'Oyun tapılmadı.' },
  GAME_NOT_JOINABLE: { status: 409, message: 'Bu oyuna artıq qoşulmaq mümkün deyil.' },
  GAME_FULL: { status: 409, message: 'Oyunda boş yer qalmayıb.' },
  ALREADY_JOINED: { status: 409, message: 'Siz artıq bu oyuna qoşulmusunuz.' },
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const gameId = Number(id)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const payload = await getPayloadClient()

  if (!Number.isSafeInteger(gameId) || gameId <= 0) {
    await recordJoinAttempt(payload, { outcome: 'INVALID_REQUEST', gameId: null, userId: null, ip })
    return errorResponse('INVALID_GAME_ID', 'Oyun ID-si yanlışdır.', 400)
  }

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    await recordJoinAttempt(payload, { outcome: 'UNAUTHENTICATED', gameId, userId: null, ip })
    return errorResponse('UNAUTHENTICATED', 'Oyuna qoşulmaq üçün daxil olun.', 401)
  }
  const userId = Number(user.id)

  try {
    const result = await claimSpot(payload, gameId, userId)

    if (!result.ok) {
      await recordJoinAttempt(payload, { outcome: result.code, gameId, userId, ip })
      const { status, message } = JOIN_ERRORS[result.code]
      return errorResponse(result.code, message, status)
    }

    invalidateGamesCache()
    await recordJoinAttempt(payload, { outcome: 'JOINED', gameId, userId, remainingSpots: result.remainingSpots, ip })

    return NextResponse.json({
      id: String(gameId),
      status: result.remainingSpots > 0 ? 'open' : 'full',
      remainingSpots: result.remainingSpots,
      currentCount: result.maxCount - result.remainingSpots,
      maxCount: result.maxCount,
    })
  } catch (error) {
    console.error(error)
    await recordJoinAttempt(payload, { outcome: 'ERROR', gameId, userId, ip })
    return errorResponse('INTERNAL_ERROR', 'Hazırda oyuna qoşulmaq mümkün olmadı.', 500)
  }
}
