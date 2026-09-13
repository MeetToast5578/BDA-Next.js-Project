import { NextResponse } from 'next/server'

import { normalizeCity } from '@/lib/game-backend'
import { getOpenGamesCountBySport } from '@/lib/game-queries'

export async function GET(request: Request) {
  const city = normalizeCity(new URL(request.url).searchParams.get('city'))
  if (!city) {
    return NextResponse.json({ error: { code: 'UNKNOWN_CITY', message: 'Unknown city.' } }, { status: 400 })
  }

  try {
    return NextResponse.json(await getOpenGamesCountBySport(city))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to load sports.' } }, { status: 500 })
  }
}
