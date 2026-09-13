import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import config from '@/payload.config'

const seedGames = [
  { title: 'Cümə axşamı 5-ə-5', sport: 'football', level: 'medium', time: '17:00:00.000Z', maxPlayers: 12, availablePlayers: 4, image: '/images/game-football-1-7880cc.png' },
  { title: 'Bazar basketbol axşamı', sport: 'basketball', level: 'high', time: '18:30:00.000Z', maxPlayers: 10, availablePlayers: 3, image: '/images/game-basketball-1-4a0ddf.png' },
  { title: 'Şənbə tennis görüşü', sport: 'tennis', level: 'beginner', time: '18:00:00.000Z', maxPlayers: 8, availablePlayers: 2, image: '/images/game-tennis-1-3ee73d.png' },
]

type SeedRecord = Record<string, unknown> & { id: string | number }
type SeedPayload = {
  find: (options: object) => Promise<{ docs: SeedRecord[] }>
  create: (options: object) => Promise<SeedRecord>
  update: (options: object) => Promise<SeedRecord>
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const payload = await getPayload({ config }) as unknown as SeedPayload
  const existingUser = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
  const host = existingUser.docs[0] || await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'seed@oyunagel.local', password: 'oyunagel-seed-password', fullName: 'Elvin Məmmədov' } })
  const existingArena = await payload.find({ collection: 'arenas', where: { name: { equals: 'Inter Arena' } }, limit: 1, overrideAccess: true })
  const arena = existingArena.docs[0] || await payload.create({ collection: 'arenas', overrideAccess: true, data: { name: 'Inter Arena', location: 'Nərimanov, Bakı', capacity: 24, description: 'Açıq hava idman meydançası' } })
  const teams: Record<string, number | string> = {}
  const today = new Date()
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  for (const sport of ['football', 'basketball', 'tennis']) {
    const existingTeam = await payload.find({ collection: 'teams', where: { shortName: { equals: `seed-${sport}` } }, limit: 1, overrideAccess: true })
    const team = existingTeam.docs[0] || await payload.create({ collection: 'teams', overrideAccess: true, data: { name: `${sport} Seed Team`, shortName: `seed-${sport}`, sport, members: [host.id] } })
    teams[sport] = team.id
  }

  for (const game of seedGames) {
    const existingGame = await payload.find({ collection: 'games', where: { title: { equals: game.title } }, limit: 1, overrideAccess: true })
    const data = { title: game.title, sport: game.sport, level: game.level, scheduledAt: `${date}T${game.time}`, maxPlayers: game.maxPlayers, availablePlayers: game.availablePlayers, image: game.image, arena: arena.id, host: host.id, homeTeam: teams[game.sport], awayTeam: teams[game.sport], status: 'scheduled' }
    if (!existingGame.docs[0]) {
      await payload.create({ collection: 'games', overrideAccess: true, data })
    } else {
      await payload.update({ collection: 'games', id: existingGame.docs[0].id, overrideAccess: true, data })
    }
  }

  return NextResponse.json({ message: 'Game seed complete' })
}