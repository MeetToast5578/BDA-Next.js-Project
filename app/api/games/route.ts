import { NextResponse } from 'next/server'

import { getGameDocs } from '@/lib/game-backend'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')
    const city = searchParams.get('city')
    const status = searchParams.get('status') ?? 'scheduled'
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit') ?? '20'), 50))

    const games = await getGameDocs()
    const filtered = games.filter((game) => {
      const normalizedStatus = status === 'open' || status === 'full' ? game.availability.status : game.status
      if (status && normalizedStatus !== status) return false
      if (sport && game.sport !== sport) return false
      if (city) {
        const location = `${game.venue.name} ${game.venue.address} ${game.venue.district}`.toLowerCase()
        if (!location.includes(city.toLowerCase())) return false
      }
      return true
    })

    const page = 1
    const docs = filtered.slice(0, limit)

    return NextResponse.json({
      docs,
      totalDocs: filtered.length,
      page,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    })
  } catch {
    return NextResponse.json({ docs: [], totalDocs: 0, page: 1, totalPages: 1 }, { status: 500 })
  }
}
