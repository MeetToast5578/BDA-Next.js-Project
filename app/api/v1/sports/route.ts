import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { normalizeCity } from '@/lib/game-backend'
import { getOpenGamesCountBySport } from '@/lib/game-queries'

export async function GET(request: Request) {
  const city = normalizeCity(new URL(request.url).searchParams.get('city'))
  if (!city) return apiError('UNKNOWN_CITY', 'Unknown city.', 400)

  try {
    return NextResponse.json(await getOpenGamesCountBySport(city))
  } catch (error) {
    console.error(error)
    return apiError('INTERNAL_ERROR', 'Unable to load sports.', 500)
  }
}
