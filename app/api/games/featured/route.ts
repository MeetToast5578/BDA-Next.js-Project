import { NextResponse } from 'next/server'

import { getGameDocs, formatBakuLabel } from '@/lib/game-backend'

const FEATURED_LIMIT = 8

export async function GET() {
  try {
    const games = await getGameDocs()

    const openGames = games.filter(
      (game) => game.status === 'scheduled' && game.availability.status === 'open' && game.remainingSpots > 0,
    )

    const now = Date.now()
    const scored = openGames.map((game) => {
      const startsAtMs = game.startsAt ? new Date(game.startsAt).getTime() : now + 7 * 24 * 60 * 60 * 1000
      const hoursUntilStart = Math.max(0, (startsAtMs - now) / (1000 * 60 * 60))
      const timeScore = Math.max(0, 1 - hoursUntilStart / (24 * 7))
      const occupancyScore = game.maxPlayers > 0 ? game.currentPlayers / game.maxPlayers : 0
      return { game, urgencyScore: timeScore * 0.6 + occupancyScore * 0.4 }
    })

    scored.sort((a, b) => b.urgencyScore - a.urgencyScore)

    const featured = scored.slice(0, FEATURED_LIMIT).map(({ game }) => ({
      id: game.id,
      title: game.title,
      sport: game.sport,
      level: game.level,
      venue: game.venue.name,
      district: game.venue.district,
      startsAt: game.startsAt,
      relativeTimeLabel: formatBakuLabel(game.startsAt),
      currentCount: game.currentPlayers,
      maxCount: game.maxPlayers,
      status: game.status,
      coverImageUrl: game.coverImageUrl,
      host: { name: game.hostName, avatarUrl: game.hostAvatarUrl ?? null },
      participants: { preview: game.participantsPreview, total: game.participantsCount },
    }))

    return NextResponse.json({ games: featured, totalDocs: featured.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ games: [], totalDocs: 0 }, { status: 500 })
  }
}