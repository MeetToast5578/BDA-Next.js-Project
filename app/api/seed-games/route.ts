import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import config from '@/payload.config'

// District, address and coordinates are only filled in where known; complete the rest in the admin panel.
const seedVenues = [
  { name: 'Inter Arena', location: 'Nərimanov, Bakı', district: 'Nərimanov', sportTypes: ['football', 'basketball', 'tennis'], capacity: 24, description: 'Açıq hava idman meydançası' },
  { name: 'Aku Arena', location: 'Bakı', sportTypes: ['football'], capacity: 20 },
  { name: '707 Stadium', location: 'Bakı', sportTypes: ['football'], capacity: 22 },
]

// Start times are relative to now, so the homepage window (today + tomorrow in Baku) always has games.
// Covers every availability state: several spots, exactly one spot, and full.
const seedGames = [
  { title: 'Cümə axşamı 5-ə-5', sport: 'football', level: 'medium', venue: 'Inter Arena', inHours: 3, maxPlayers: 12, availablePlayers: 4, image: '/images/game-football-1-7880cc.png' },
  { title: 'Bazar basketbol axşamı', sport: 'basketball', level: 'high', venue: 'Inter Arena', inHours: 5, maxPlayers: 10, availablePlayers: 3, image: '/images/game-basketball-1-4a0ddf.png' },
  { title: 'Şənbə tennis görüşü', sport: 'tennis', level: 'beginner', venue: 'Inter Arena', inHours: 26, maxPlayers: 8, availablePlayers: 2, image: '/images/game-tennis-1-3ee73d.png' },
  { title: 'Aku Arena axşam futbolu', sport: 'football', level: 'beginner', venue: 'Aku Arena', inHours: 8, maxPlayers: 10, availablePlayers: 1 },
  { title: '707 Stadium 5-ə-5', sport: 'football', level: 'high', venue: '707 Stadium', inHours: 28, maxPlayers: 10, availablePlayers: 0 },
]

const HOUR_MS = 60 * 60 * 1000
const HALF_HOUR_MS = HOUR_MS / 2

type SeedRecord = Record<string, unknown> & { id: string | number }
type SeedPayload = {
  find: (options: object) => Promise<{ docs: SeedRecord[] }>
  create: (options: object) => Promise<SeedRecord>
  update: (options: object) => Promise<SeedRecord>
}

async function upsert(payload: SeedPayload, collection: string, where: object, data: object) {
  const existing = await payload.find({ collection, where, limit: 1, overrideAccess: true })
  return existing.docs[0]
    ? payload.update({ collection, id: existing.docs[0].id, overrideAccess: true, data })
    : payload.create({ collection, overrideAccess: true, data })
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const payload = await getPayload({ config }) as unknown as SeedPayload
  const existingUser = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
  const host = existingUser.docs[0] || await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'seed@oyunagel.local', password: 'oyunagel-seed-password', fullName: 'Elvin Məmmədov' } })

  const venues: Record<string, number | string> = {}
  for (const venue of seedVenues) {
    const arena = await upsert(payload, 'arenas', { name: { equals: venue.name } }, { ...venue, city: 'baku' })
    venues[venue.name] = arena.id
  }

  const teams: Record<string, number | string> = {}
  for (const sport of ['football', 'basketball', 'tennis']) {
    const existingTeam = await payload.find({ collection: 'teams', where: { shortName: { equals: `seed-${sport}` } }, limit: 1, overrideAccess: true })
    const team = existingTeam.docs[0] || await payload.create({ collection: 'teams', overrideAccess: true, data: { name: `${sport} Seed Team`, shortName: `seed-${sport}`, sport, members: [host.id] } })
    teams[sport] = team.id
  }

  for (const game of seedGames) {
    const scheduledAt = new Date(Math.ceil((Date.now() + game.inHours * HOUR_MS) / HALF_HOUR_MS) * HALF_HOUR_MS)
    await upsert(payload, 'games', { title: { equals: game.title } }, {
      title: game.title,
      sport: game.sport,
      level: game.level,
      scheduledAt: scheduledAt.toISOString(),
      maxPlayers: game.maxPlayers,
      availablePlayers: game.availablePlayers,
      image: game.image ?? null,
      arena: venues[game.venue],
      host: host.id,
      homeTeam: teams[game.sport],
      awayTeam: teams[game.sport],
      status: 'scheduled',
    })
  }

  return NextResponse.json({ message: 'Game seed complete' })
}
