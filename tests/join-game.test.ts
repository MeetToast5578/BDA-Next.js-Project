import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

import { claimSpot } from '@/lib/join-game'

// Runs against the database in DATABASE_URL. Every record it creates is removed afterwards.
describe.skipIf(!process.env.DATABASE_URL)('claimSpot (Postgres)', () => {
  const suffix = Date.now()
  const gameIds: number[] = []
  let payload: Payload
  let userIds: number[]
  let arenaId: number
  let teamId: number

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    payload = await getPayload({ config })

    const users = await Promise.all(
      [1, 2].map((n) =>
        payload.create({
          collection: 'users',
          data: { email: `join-test-${suffix}-${n}@oyunagel.test`, password: 'join-test-password', fullName: `Join Test ${n}` },
        }),
      ),
    )
    userIds = users.map((user) => user.id)
    arenaId = (await payload.create({ collection: 'arenas', data: { name: `Join Test Arena ${suffix}`, location: 'Bakı' } })).id
    teamId = (await payload.create({ collection: 'teams', data: { name: `Join Test ${suffix}`, sport: 'football' } })).id
  })

  afterAll(async () => {
    if (!payload) return
    if (gameIds.length) {
      await payload.delete({ collection: 'game-participants', where: { game: { in: gameIds } } })
      await payload.delete({ collection: 'games', where: { id: { in: gameIds } } })
    }
    await payload.delete({ collection: 'teams', where: { id: { equals: teamId } } })
    await payload.delete({ collection: 'arenas', where: { id: { equals: arenaId } } })
    await payload.delete({ collection: 'users', where: { id: { in: userIds } } })
    await payload.db.destroy?.()
  })

  async function createGame(overrides: { availablePlayers: number; status?: 'scheduled' | 'cancelled'; startsInHours?: number }) {
    const game = await payload.create({
      collection: 'games',
      data: {
        title: `Join Test Game ${suffix}`,
        sport: 'football',
        level: 'medium',
        arena: arenaId,
        host: userIds[0],
        homeTeam: teamId,
        awayTeam: teamId,
        scheduledAt: new Date(Date.now() + (overrides.startsInHours ?? 3) * 60 * 60 * 1000).toISOString(),
        maxPlayers: 10,
        availablePlayers: overrides.availablePlayers,
        status: overrides.status ?? 'scheduled',
      },
    })
    gameIds.push(game.id)
    return game.id
  }

  async function participantCount(gameId: number) {
    const { totalDocs } = await payload.count({ collection: 'game-participants', where: { game: { equals: gameId } } })
    return totalDocs
  }

  it('lets only one of two parallel requests take the last spot', async () => {
    const gameId = await createGame({ availablePlayers: 1 })

    const results = await Promise.all(userIds.map((userId) => claimSpot(payload, gameId, userId)))

    expect(results.filter((result) => result.ok)).toEqual([{ ok: true, remainingSpots: 0, maxCount: 10 }])
    expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, code: 'GAME_FULL' }])
    expect((await payload.findByID({ collection: 'games', id: gameId })).availablePlayers).toBe(0)
    expect(await participantCount(gameId)).toBe(1)
  })

  it('rejects a second join by the same user without taking another spot', async () => {
    const gameId = await createGame({ availablePlayers: 5 })

    expect(await claimSpot(payload, gameId, userIds[0])).toEqual({ ok: true, remainingSpots: 4, maxCount: 10 })
    expect(await claimSpot(payload, gameId, userIds[0])).toEqual({ ok: false, code: 'ALREADY_JOINED' })
    expect((await payload.findByID({ collection: 'games', id: gameId })).availablePlayers).toBe(4)
    expect(await participantCount(gameId)).toBe(1)
  })

  it('rejects cancelled and already-started games', async () => {
    const cancelled = await createGame({ availablePlayers: 5, status: 'cancelled' })
    const started = await createGame({ availablePlayers: 5, startsInHours: -1 })

    expect(await claimSpot(payload, cancelled, userIds[0])).toEqual({ ok: false, code: 'GAME_NOT_JOINABLE' })
    expect(await claimSpot(payload, started, userIds[0])).toEqual({ ok: false, code: 'GAME_NOT_JOINABLE' })
  })

  it('stores the name and phone the join form collected', async () => {
    const gameId = await createGame({ availablePlayers: 5 })

    expect(await claimSpot(payload, gameId, userIds[0], '+994502103456', 'Kərim Məmmədov')).toEqual({
      ok: true,
      remainingSpots: 4,
      maxCount: 10,
    })

    const { docs } = await payload.find({
      collection: 'game-participants',
      where: { game: { equals: gameId } },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0].name).toBe('Kərim Məmmədov')
    expect(docs[0].phone).toBe('+994502103456')
  })

  it('reports a missing game', async () => {
    expect(await claimSpot(payload, 2_000_000_000, userIds[0])).toEqual({ ok: false, code: 'GAME_NOT_FOUND' })
  })
})
