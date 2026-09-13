import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import config from '@/payload.config'

type PayloadRecord = Record<string, unknown> & { id: string | number }
type PayloadClient = {
  find: (options: object) => Promise<{ docs: PayloadRecord[] }>
  create: (options: object) => Promise<PayloadRecord>
}

const sportValues: Record<string, string> = { Futbol: 'football', Tennis: 'tennis', Basketbol: 'basketball' }
const levelValues: Record<string, string> = { Başlanğıc: 'beginner', Orta: 'medium', Yüksək: 'high' }
const sportImages: Record<string, string> = {
  football: '/images/game-football-1-7880cc.png',
  basketball: '/images/game-basketball-1-4a0ddf.png',
  tennis: '/images/game-tennis-1-3ee73d.png',
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, string>
    const payload = await getPayload({ config }) as unknown as PayloadClient
    const users = await payload.find({ collection: 'users', limit: 1, overrideAccess: true })
    const host = users.docs[0] || await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'seed@oyunagel.local', password: 'oyunagel-seed-password', fullName: body.hostName || 'OyunaGəl istifadəçisi' } })
    const arenaName = String(body.arena).split(' — ')[0]
    const arenas = await payload.find({ collection: 'arenas', where: { name: { equals: arenaName } }, limit: 1, overrideAccess: true })
    const arena = arenas.docs[0] || await payload.create({
      collection: 'arenas', overrideAccess: true,
      data: { name: arenaName, location: String(body.arena).split(' — ')[1] || 'Bakı', capacity: Number(body.maxPlayers) || 10 },
    })
    const sport = sportValues[body.sport]
    const level = levelValues[body.level]

    if (!arena || !sport || !level) return NextResponse.json({ error: 'Oyun məlumatları tam deyil.' }, { status: 400 })

    const teams = await payload.find({ collection: 'teams', where: { shortName: { equals: `seed-${sport}` } }, limit: 1, overrideAccess: true })
    const team = teams.docs[0]
    if (!team) return NextResponse.json({ error: 'Bu idman növü üçün komanda tapılmadı.' }, { status: 400 })

    const game = await payload.create({
      collection: 'games', overrideAccess: true,
      data: {
        title: `${body.sport} oyunu`, sport, level, image: sportImages[sport],
        scheduledAt: `${body.scheduledDate}T${body.scheduledTime}:00.000Z`,
        maxPlayers: Number(body.maxPlayers), availablePlayers: Number(body.availablePlayers || 0),
        arena: arena.id, host: host.id, homeTeam: team.id, awayTeam: team.id,
      },
    })

    return NextResponse.json({ game }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Oyun yaratmaq mümkün olmadı.' }, { status: 500 })
  }
}