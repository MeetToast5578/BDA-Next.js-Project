import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { invalidateGamesCache } from '@/lib/cache-tags'
import { normalizePhone } from '@/lib/game-backend'
import { getGameDetail, getPayloadClient } from '@/lib/game-queries'
import { claimSpot, recordJoinAttempt, type JoinErrorCode } from '@/lib/join-game'

const JOIN_ERRORS: Record<JoinErrorCode, { status: number; message: string }> = {
  GAME_NOT_FOUND: { status: 404, message: 'Oyun tapılmadı.' },
  GAME_NOT_JOINABLE: { status: 409, message: 'Bu oyuna artıq qoşulmaq mümkün deyil.' },
  GAME_FULL: { status: 409, message: 'Oyunda boş yer qalmayıb.' },
  ALREADY_JOINED: { status: 409, message: 'Siz artıq bu oyuna qoşulmusunuz.' },
}

/**
 * "Oyuna qoşul". Requires a signed-in user; the optional JSON body `{ phone }` is the number from the
 * join form (defaults to the profile's). The response carries the game with the host's phone for the
 * "Bir addım qaldı" step.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gameId = Number((await params).id)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const payload = await getPayloadClient()

  if (!Number.isSafeInteger(gameId) || gameId <= 0) {
    await recordJoinAttempt(payload, { outcome: 'INVALID_REQUEST', gameId: null, userId: null, ip })
    return apiError('INVALID_GAME_ID', 'Oyun ID-si yanlışdır.', 400)
  }

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    await recordJoinAttempt(payload, { outcome: 'UNAUTHENTICATED', gameId, userId: null, ip })
    return apiError('UNAUTHENTICATED', 'Oyuna qoşulmaq üçün daxil olun.', 401)
  }
  const userId = Number(user.id)

  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null
  const phoneInput = body?.phone
  const phone = phoneInput === undefined || phoneInput === null || phoneInput === ''
    ? normalizePhone(user.phoneNumber)
    : normalizePhone(phoneInput)
  if (phoneInput && !phone) {
    await recordJoinAttempt(payload, { outcome: 'INVALID_REQUEST', gameId, userId, ip })
    return apiError('INVALID_PHONE', 'Telefon nömrəsi yanlışdır, məsələn +994 50 210 34 56.', 400)
  }

  try {
    const result = await claimSpot(payload, gameId, userId, phone)

    if (!result.ok) {
      await recordJoinAttempt(payload, { outcome: result.code, gameId, userId, ip })
      const { status, message } = JOIN_ERRORS[result.code]
      return apiError(result.code, message, status)
    }

    invalidateGamesCache()
    await recordJoinAttempt(payload, { outcome: 'JOINED', gameId, userId, remainingSpots: result.remainingSpots, ip })

    // The spot is already claimed, so a failure loading the detail must not turn this into an error.
    const game = await getGameDetail(gameId, userId).catch((error) => {
      console.error(error)
      return null
    })

    return NextResponse.json({
      id: String(gameId),
      status: result.remainingSpots > 0 ? 'open' : 'full',
      remainingSpots: result.remainingSpots,
      currentCount: result.maxCount - result.remainingSpots,
      maxCount: result.maxCount,
      game,
    })
  } catch (error) {
    console.error(error)
    await recordJoinAttempt(payload, { outcome: 'ERROR', gameId, userId, ip })
    return apiError('INTERNAL_ERROR', 'Hazırda oyuna qoşulmaq mümkün olmadı.', 500)
  }
}
