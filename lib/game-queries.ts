import { unstable_cache } from 'next/cache'
import type { Where } from 'payload'

import { GAMES_CACHE_TAG } from '@/lib/cache-tags'
import {
  DEFAULT_CITY,
  FEATURED_WINDOW_HOURS,
  countOpenGamesBySport,
  deriveAvailability,
  formatBakuLabel,
  initialsOf,
  normalizeGameRecord,
  rankFeatured,
  toGameCard,
  type GameListQuery,
} from '@/lib/game-backend'

/** Cached reads refresh at least this often; game, venue and join writes expire them immediately. */
const CACHE_SECONDS = 60
const FEATURED_CANDIDATE_LIMIT = 100
const PARTICIPANT_PREVIEW_SIZE = 5
const HOUR_MS = 60 * 60 * 1000

const CARD_SELECT = {
  title: true,
  sport: true,
  level: true,
  arena: true,
  host: true,
  scheduledAt: true,
  maxPlayers: true,
  availablePlayers: true,
  status: true,
  coverImage: true,
  image: true,
} as const

const CARD_POPULATE = { users: { fullName: true, profilePicture: true } } as const

export async function getPayloadClient() {
  const { getPayload } = await import('payload')
  const config = (await import('@/payload.config')).default
  return getPayload({ config })
}

function cityWhere(city: string): Where {
  // Venues created before the city field existed have no value and are in the default city.
  return city === DEFAULT_CITY
    ? { or: [{ 'arena.city': { equals: city } }, { 'arena.city': { exists: false } }] }
    : { 'arena.city': { equals: city } }
}

function upcomingOpenWhere(city: string, from: Date, to?: Date): Where {
  return {
    and: [
      { status: { equals: 'scheduled' } },
      { scheduledAt: { greater_than: from.toISOString() } },
      ...(to ? [{ scheduledAt: { less_than: to.toISOString() } }] : []),
      { availablePlayers: { greater_than: 0 } },
      cityWhere(city),
    ],
  }
}

const findOpenGameSlots = unstable_cache(
  async (city: string) => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'games',
      where: upcomingOpenWhere(city, new Date()),
      select: { sport: true, status: true, scheduledAt: true, maxPlayers: true, availablePlayers: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    return docs
  },
  ['open-game-slots'],
  { tags: [GAMES_CACHE_TAG], revalidate: CACHE_SECONDS },
)

export async function getOpenGamesCountBySport(city: string, now = Date.now()) {
  // Availability is re-derived per request so a game that started since the cache fill is not counted.
  const slots = await findOpenGameSlots(city)
  return countOpenGamesBySport(
    slots.map((slot) => ({ sport: String(slot.sport), status: deriveAvailability(slot, now).status })),
  )
}

export async function findGames(query: GameListQuery, now = new Date()) {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'games',
    where: {
      and: [
        { status: { equals: 'scheduled' } },
        { scheduledAt: { greater_than: query.from.toISOString() } },
        { scheduledAt: { less_than: query.to.toISOString() } },
        cityWhere(query.city),
        ...(query.sport ? [{ sport: { equals: query.sport } }] : []),
        ...(query.onlyOpen ? [{ availablePlayers: { greater_than: 0 } }] : []),
      ],
    },
    select: CARD_SELECT,
    populate: CARD_POPULATE,
    sort: 'scheduledAt',
    page: query.page,
    limit: query.limit,
    depth: 2,
    overrideAccess: true,
  })

  return {
    games: result.docs.map((doc) => toGameCard(normalizeGameRecord(doc, now.getTime()))),
    pagination: {
      page: result.page ?? query.page,
      limit: query.limit,
      totalDocs: result.totalDocs,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
    },
  }
}

const findFeaturedCandidates = unstable_cache(
  async (city: string) => {
    const payload = await getPayloadClient()
    const now = Date.now()
    const { docs } = await payload.find({
      collection: 'games',
      where: upcomingOpenWhere(city, new Date(now), new Date(now + FEATURED_WINDOW_HOURS * HOUR_MS)),
      select: CARD_SELECT,
      populate: CARD_POPULATE,
      sort: 'scheduledAt',
      limit: FEATURED_CANDIDATE_LIMIT,
      depth: 2,
      overrideAccess: true,
    })
    if (docs.length === 0) return []

    const { docs: participants } = await payload.find({
      collection: 'game-participants',
      where: { game: { in: docs.map((doc) => doc.id) } },
      select: { game: true, user: true },
      populate: { users: { fullName: true }, games: { title: true } },
      sort: 'createdAt',
      depth: 1,
      pagination: false,
      overrideAccess: true,
    })

    const previews = new Map<string, Array<{ name: string; initials: string }>>()
    for (const participant of participants) {
      const gameId = String(typeof participant.game === 'object' ? participant.game?.id : participant.game)
      const preview = previews.get(gameId) ?? []
      if (preview.length >= PARTICIPANT_PREVIEW_SIZE) continue
      const name = (typeof participant.user === 'object' && participant.user?.fullName) || 'OyunaGəl istifadəçisi'
      preview.push({ name, initials: initialsOf(name) })
      previews.set(gameId, preview)
    }

    return docs.map((doc) => ({ doc, participants: previews.get(String(doc.id)) ?? [] }))
  },
  ['featured-candidates'],
  { tags: [GAMES_CACHE_TAG], revalidate: CACHE_SECONDS },
)

export async function getFeaturedGames(city: string, limit: number, now = Date.now()) {
  const candidates = await findFeaturedCandidates(city)
  const games = candidates.map(({ doc, participants }) => ({ ...normalizeGameRecord(doc, now), participants }))

  // Ranking and labels are computed per request so they never go stale with the cache.
  return rankFeatured(games, now, limit).map((game) => ({
    ...toGameCard(game),
    relativeTimeLabel: formatBakuLabel(game.startsAt, new Date(now)),
    participants: { preview: game.participants, total: game.currentCount },
  }))
}
