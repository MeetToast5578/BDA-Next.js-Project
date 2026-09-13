import { NextResponse } from 'next/server'

import { getGameDocs } from '@/lib/game-backend'

export async function GET() {
  try {
    const games = await getGameDocs()
    const openGames = games.filter((game) => game.availability.status === 'open' || (game.status === 'scheduled' && game.remainingSpots > 0))

    const sportsMap = new Map<string, { sport: string; label: string; icon: string; openGames: number }>()

    for (const game of openGames) {
      const current = sportsMap.get(game.sport) ?? {
        sport: game.sport,
        label: game.sportLabel,
        icon: game.icon,
        openGames: 0,
      }

      current.openGames += 1
      sportsMap.set(game.sport, current)
    }

    return NextResponse.json(Array.from(sportsMap.values()))
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
