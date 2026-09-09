import { NextResponse } from 'next/server'

import { getGameDocs } from '@/lib/game-backend'

export async function GET() {
  try {
    const games = await getGameDocs()
    const featured = games
      .filter((game) => game.availability.status === 'open' || (game.status === 'scheduled' && game.remainingSpots > 0))
      .slice(0, 8)

    return NextResponse.json({
      docs: featured,
      totalDocs: featured.length,
    })
  } catch {
    return NextResponse.json({ docs: [], totalDocs: 0 }, { status: 500 })
  }
}
