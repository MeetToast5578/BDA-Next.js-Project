import { NextResponse } from 'next/server'

import { FEATURED_LIMIT, normalizeCity } from '@/lib/game-backend'
import { getFeaturedGames } from '@/lib/game-queries'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = normalizeCity(searchParams.get('city'))
  if (!city) {
    return NextResponse.json({ error: { code: 'UNKNOWN_CITY', message: 'Unknown city.' } }, { status: 400 })
  }

  const requestedLimit = Number.parseInt(searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(requestedLimit) ? Math.min(FEATURED_LIMIT, Math.max(1, requestedLimit)) : FEATURED_LIMIT

  try {
    const games = await getFeaturedGames(city, limit)
    return NextResponse.json({ games, totalDocs: games.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to load featured games.' } }, { status: 500 })
  }
}
