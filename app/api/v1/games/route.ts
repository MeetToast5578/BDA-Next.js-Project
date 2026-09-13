import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { parseCreateGameBody, parseGameListParams } from '@/lib/game-backend'
import { createGame, findGames, getPayloadClient } from '@/lib/game-queries'

export async function GET(request: Request) {
  const now = new Date()
  const parsed = parseGameListParams(new URL(request.url).searchParams, now)
  if (!parsed.ok) return apiError(parsed.code, parsed.message, 400)

  try {
    return NextResponse.json(await findGames(parsed.query, now))
  } catch (error) {
    console.error(error)
    return apiError('INTERNAL_ERROR', 'Unable to load games.', 500)
  }
}

/** "Yeni Oyun Yarat": the signed-in user becomes the host. */
export async function POST(request: Request) {
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return apiError('UNAUTHENTICATED', 'Oyun yaratmaq üçün daxil olun.', 401)

    const parsed = parseCreateGameBody(await request.json().catch(() => null))
    if (!parsed.ok) return apiError(parsed.code, parsed.message, 400)

    const result = await createGame({ id: Number(user.id), phoneNumber: user.phoneNumber }, parsed.input)
    if (!result.ok) return apiError(result.code, result.message, 400)

    return NextResponse.json({ game: result.game }, { status: 201 })
  } catch (error) {
    console.error(error)
    return apiError('INTERNAL_ERROR', 'Oyun yaratmaq mümkün olmadı.', 500)
  }
}
