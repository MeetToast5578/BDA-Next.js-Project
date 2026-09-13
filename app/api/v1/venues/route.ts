import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { SPORTS, normalizeCity } from '@/lib/game-backend'
import { listVenues } from '@/lib/game-queries'

/** Options for the "Meydança" picker on the create-game form. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = normalizeCity(searchParams.get('city'))
  if (!city) return apiError('UNKNOWN_CITY', 'Unknown city.', 400)

  const sport = searchParams.get('sport')
  if (sport && !SPORTS.includes(sport)) return apiError('INVALID_SPORT', `sport must be one of: ${SPORTS.join(', ')}`, 400)

  try {
    return NextResponse.json(await listVenues(city, sport, searchParams.get('q')))
  } catch (error) {
    console.error(error)
    return apiError('INTERNAL_ERROR', 'Unable to load venues.', 500)
  }
}
