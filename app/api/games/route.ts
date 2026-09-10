import { NextResponse } from 'next/server'

import { getGameDocs } from '@/lib/game-backend'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')
    const city = searchParams.get('city')
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit') ?? '12'), 50))
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfTomorrow = new Date(startOfToday)
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 2)

    const from = searchParams.get('from') ?? startOfToday.toISOString()
    const to = searchParams.get('to') ?? endOfTomorrow.toISOString()

    const allGames = await getGameDocs()

    const filtered = allGames.filter((game) => {
      if (sport && game.sport !== sport) return false
      if (city && game.venue.district.toLowerCase() !== city.toLowerCase()) return false
      if (game.startsAt) {
        const gameDate = new Date(game.startsAt).toISOString()
        if (gameDate < from || gameDate >= to) return false
      }
      return true
    })

    const totalDocs = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalDocs / limit))
    const pageDocs = filtered.slice((page - 1) * limit, page * limit)

    const games = pageDocs.map((game) => ({
      id: game.id,
      title: game.title,
      sport: game.sport,
      level: game.level,
      venue: game.venue.name,
      district: game.venue.district,
      startsAt: game.startsAt,
      currentCount: game.currentPlayers,
      maxCount: game.maxPlayers,
      status: game.status,
      coverImageUrl: game.coverImageUrl,
      host: {
        name: game.hostName,
        avatarUrl: game.hostAvatarUrl ?? null,
      },
    }))

    return NextResponse.json({
      games,
      pagination: { page, limit, totalDocs, totalPages, hasNextPage: page < totalPages },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { games: [], pagination: { page: 1, limit: 0, totalDocs: 0, totalPages: 1, hasNextPage: false } },
      { status: 500 },
    )
  }
}