import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

import { claimSpot, releaseSpot } from '@/lib/join-game'
import { deleteMyAccount, findMyGames, getMyProfile, getPublicProfile, updateMyProfile } from '@/lib/profile-queries'

const HOUR_MS = 60 * 60 * 1000

/**
 * The profile backend against the real database: leaving a game, "my games", the profile itself and
 * account deletion. Every record it creates is removed afterwards.
 */
describe.skipIf(!process.env.DATABASE_URL)('profile backend (Postgres)', () => {
  const suffix = Date.now()
  let payload: Payload
  let host: number
  let player: number
  let arenaId: number
  const gameIds: number[] = []

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    payload = await getPayload({ config })

    const users = await Promise.all(
      ['host', 'player'].map((role) =>
        payload.create({
          collection: 'users',
          overrideAccess: true,
          data: {
            email: `profile-${suffix}-${role}@oyunagel.test`,
            password: 'profile-test-password',
            fullName: `Profile ${role}`,
          },
        }),
      ),
    )
    host = users[0].id
    player = users[1].id
    arenaId = (
      await payload.create({
        collection: 'arenas',
        overrideAccess: true,
        data: { name: `Profile Arena ${suffix}`, location: 'Bakı' },
      })
    ).id
  })

  afterAll(async () => {
    if (!payload) return
    if (gameIds.length) {
      await payload.delete({ collection: 'game-participants', where: { game: { in: gameIds } } })
      await payload.delete({ collection: 'games', where: { id: { in: gameIds } } })
    }
    await payload.delete({ collection: 'arenas', where: { id: { equals: arenaId } } })
    await payload.delete({ collection: 'users', where: { id: { in: [host, player] } } })
    await payload.db.destroy?.()
  })

  async function makeGame({ owner = host, hoursFromNow = 3, availablePlayers = 5 } = {}) {
    const game = await payload.create({
      collection: 'games',
      overrideAccess: true,
      data: {
        title: `Profile Game ${suffix}`,
        sport: 'football',
        level: 'medium',
        arena: arenaId,
        host: owner,
        scheduledAt: new Date(Date.now() + hoursFromNow * HOUR_MS).toISOString(),
        maxPlayers: 10,
        availablePlayers,
        status: 'scheduled',
      },
    })
    gameIds.push(game.id)
    return game.id
  }

  const spotsLeft = async (id: number) =>
    (await payload.findByID({ collection: 'games', id, overrideAccess: true })).availablePlayers

  describe('releaseSpot', () => {
    it('gives the spot back and refuses to give it twice', async () => {
      const gameId = await makeGame({ availablePlayers: 5 })
      await claimSpot(payload, gameId, player, null, 'Player')
      expect(await spotsLeft(gameId)).toBe(4)

      expect(await releaseSpot(payload, gameId, player)).toEqual({ ok: true, remainingSpots: 5, maxCount: 10 })
      expect(await spotsLeft(gameId)).toBe(5)

      // The exploit this guards: a second leave must not invent another spot.
      expect(await releaseSpot(payload, gameId, player)).toEqual({ ok: false, code: 'NOT_JOINED' })
      expect(await spotsLeft(gameId)).toBe(5)
    })

    it('never pushes availability past the size of the game', async () => {
      const gameId = await makeGame({ availablePlayers: 5 })
      await claimSpot(payload, gameId, player, null, 'Player')

      const results = await Promise.all([
        releaseSpot(payload, gameId, player),
        releaseSpot(payload, gameId, player),
        releaseSpot(payload, gameId, player),
      ])

      expect(results.filter((r) => r.ok)).toHaveLength(1)
      expect(await spotsLeft(gameId)).toBe(5)
    })

    it('will not let the host leave their own game', async () => {
      const gameId = await makeGame()
      await claimSpot(payload, gameId, host, null, 'Host')
      expect(await releaseSpot(payload, gameId, host)).toEqual({ ok: false, code: 'HOST_CANNOT_LEAVE' })
    })

    it('refuses once the game has started, and for a game that is gone', async () => {
      const started = await makeGame({ hoursFromNow: -1 })
      expect(await releaseSpot(payload, started, player)).toEqual({ ok: false, code: 'GAME_STARTED' })
      expect(await releaseSpot(payload, 2_000_000_000, player)).toEqual({ ok: false, code: 'GAME_NOT_FOUND' })
    })

    it('reports NOT_JOINED for someone who never joined', async () => {
      const gameId = await makeGame()
      expect(await releaseSpot(payload, gameId, player)).toEqual({ ok: false, code: 'NOT_JOINED' })
    })
  })

  describe('findMyGames', () => {
    it('separates hosting from joined, and keeps own games out of joined', async () => {
      const hostedByHost = await makeGame({ owner: host })
      const hostedByPlayer = await makeGame({ owner: player })
      await claimSpot(payload, hostedByHost, player, null, 'Player')
      // The player is a participant in their own game too, which must not show up under "joined".
      await claimSpot(payload, hostedByPlayer, player, null, 'Player')

      const joined = await findMyGames(player, { role: 'joined', when: 'upcoming', page: 1, limit: 50 })
      const hosting = await findMyGames(player, { role: 'hosting', when: 'upcoming', page: 1, limit: 50 })

      const ids = (list: { games: { id: string }[] }) => list.games.map((g) => Number(g.id))
      expect(ids(joined)).toContain(hostedByHost)
      expect(ids(joined)).not.toContain(hostedByPlayer)
      expect(ids(hosting)).toContain(hostedByPlayer)
      expect(ids(hosting)).not.toContain(hostedByHost)
    })

    it('splits upcoming from past', async () => {
      const past = await makeGame({ owner: host, hoursFromNow: -48 })

      const upcoming = await findMyGames(host, { role: 'hosting', when: 'upcoming', page: 1, limit: 50 })
      const history = await findMyGames(host, { role: 'hosting', when: 'past', page: 1, limit: 50 })

      expect(history.games.map((g) => Number(g.id))).toContain(past)
      expect(upcoming.games.map((g) => Number(g.id))).not.toContain(past)
    })

    it('returns cards carrying server-derived status, not raw rows', async () => {
      const list = await findMyGames(host, { role: 'hosting', when: 'upcoming', page: 1, limit: 1 })
      expect(list.games[0]).toMatchObject({
        sportLabel: expect.any(String),
        status: expect.any(String),
        remainingSpots: expect.any(Number),
        coverImageUrl: expect.any(String),
      })
      expect(list.pagination.limit).toBe(1)
    })
  })

  describe('getMyProfile / updateMyProfile', () => {
    it('reports identity, counts and per-sport stats without leaking the account internals', async () => {
      const profile = await getMyProfile(host)

      expect(profile).not.toBeNull()
      expect(profile!.email).toContain('@oyunagel.test')
      expect(profile!.counts.hostingUpcoming).toBeGreaterThan(0)
      expect(profile!.stats.playedBySport.map((s) => s.sport)).toEqual(['football', 'basketball', 'tennis'])
      expect(profile).not.toHaveProperty('role')
      expect(profile).not.toHaveProperty('googleId')
      expect(profile).not.toHaveProperty('password')
    })

    it('saves a normalized phone and a new name', async () => {
      const result = await updateMyProfile(host, { fullName: 'Yeni Ad', phone: '+994552223344' })
      expect(result.ok).toBe(true)
      expect(result.ok && result.profile.fullName).toBe('Yeni Ad')
      expect(result.ok && result.profile.phoneNumber).toBe('+994552223344')
    })

    it('refuses a phone another account already holds', async () => {
      await updateMyProfile(player, { phone: '+994553334455' })
      expect(await updateMyProfile(host, { phone: '+994553334455' })).toMatchObject({
        ok: false,
        code: 'PHONE_TAKEN',
      })
    })
  })

  describe('getPublicProfile', () => {
    it('shows the host and their games but never their contact details', async () => {
      const profile = await getPublicProfile(host)

      expect(profile).not.toBeNull()
      expect(profile!.fullName).toBeTruthy()
      expect(profile).not.toHaveProperty('email')
      expect(profile).not.toHaveProperty('phoneNumber')
      expect(Array.isArray(profile!.hostedGames)).toBe(true)
    })

    it('is null for a user that does not exist', async () => {
      expect(await getPublicProfile(2_000_000_000)).toBeNull()
    })
  })

  describe('deleteMyAccount', () => {
    it('takes the hosted games with it instead of leaving them hostless', async () => {
      const doomed = await payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          email: `profile-${suffix}-doomed@oyunagel.test`,
          password: 'profile-test-password',
          fullName: 'Doomed Host',
        },
      })
      const game = await payload.create({
        collection: 'games',
        overrideAccess: true,
        data: {
          title: `Doomed Game ${suffix}`,
          sport: 'football',
          level: 'medium',
          arena: arenaId,
          host: doomed.id,
          scheduledAt: new Date(Date.now() + 5 * HOUR_MS).toISOString(),
          maxPlayers: 10,
          availablePlayers: 9,
          status: 'scheduled',
        },
      })
      await claimSpot(payload, game.id, player, null, 'Player')

      const { deletedGames } = await deleteMyAccount(doomed.id)

      expect(deletedGames).toBe(1)
      expect(
        await payload.findByID({ collection: 'games', id: game.id, overrideAccess: true, disableErrors: true }),
      ).toBeFalsy()
      // The real regression: a game left behind with no host at all.
      const hostless = await payload.count({
        collection: 'games',
        where: { host: { exists: false } },
        overrideAccess: true,
      })
      expect(hostless.totalDocs).toBe(0)
      const strays = await payload.count({
        collection: 'game-participants',
        where: { game: { equals: game.id } },
        overrideAccess: true,
      })
      expect(strays.totalDocs).toBe(0)
    })
  })
})
