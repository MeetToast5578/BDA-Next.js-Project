import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'

import { GAMES_CACHE_TAG, invalidateGamesCache } from '@/lib/cache-tags'
import {
  DEFAULT_CITY,
  FEATURED_WINDOW_HOURS,
  countOpenGamesBySport,
  deriveAvailability,
  foldForSearch,
  initialsOf,
  normalizeGameRecord,
  normalizePhone,
  normalizeVenue,
  rankFeatured,
  toGameCard,
  userAvatarUrl,
  type CreateGameInput,
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

const CARD_POPULATE = { users: { fullName: true, profilePicture: true, avatarUrl: true } } as const

type ParticipantPreview = { name: string; initials: string; avatarUrl: string | null }

export async function getPayloadClient() {
  const { getPayload } = await import('payload')
  const config = (await import('@/payload.config')).default
  return getPayload({ config })
}

function cityWhere(field: 'arena.city' | 'city', city: string): Where {
  // Venues created before the city field existed have no value and are in the default city.
  return city === DEFAULT_CITY
    ? { or: [{ [field]: { equals: city } }, { [field]: { exists: false } }] }
    : { [field]: { equals: city } }
}

function upcomingOpenWhere(city: string, from: Date, to?: Date): Where {
  return {
    and: [
      { status: { equals: 'scheduled' } },
      { scheduledAt: { greater_than: from.toISOString() } },
      ...(to ? [{ scheduledAt: { less_than: to.toISOString() } }] : []),
      { availablePlayers: { greater_than: 0 } },
      cityWhere('arena.city', city),
    ],
  }
}

/** First players to join each game, oldest first, for the avatar stacks. */
async function findParticipantPreviews(payload: Payload, gameIds: Array<number | string>) {
  const previews = new Map<string, ParticipantPreview[]>()
  if (gameIds.length === 0) return previews

  const { docs } = await payload.find({
    collection: 'game-participants',
    where: { game: { in: gameIds } },
    select: { game: true, user: true },
    populate: { ...CARD_POPULATE, games: { title: true } },
    sort: 'createdAt',
    depth: 2,
    pagination: false,
    overrideAccess: true,
  })

  for (const participant of docs) {
    const gameId = String(typeof participant.game === 'object' ? participant.game?.id : participant.game)
    const preview = previews.get(gameId) ?? []
    if (preview.length >= PARTICIPANT_PREVIEW_SIZE) continue
    const user = typeof participant.user === 'object' ? participant.user : null
    const name = user?.fullName || 'OyunaGəl istifadəçisi'
    preview.push({ name, initials: initialsOf(name), avatarUrl: userAvatarUrl(user) })
    previews.set(gameId, preview)
  }
  return previews
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
        cityWhere('arena.city', query.city),
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
    const previews = await findParticipantPreviews(payload, docs.map((doc) => doc.id))
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
    participants: { preview: game.participants, total: game.currentCount },
  }))
}

/**
 * The "Oyun Detalı" page. Not cached: `viewer` and the host's phone depend on who is asking.
 * The phone is only revealed to players who joined and to the host.
 */
export async function getGameDetail(gameId: number, viewerId: number | null, now = Date.now()) {
  const payload = await getPayloadClient()
  const doc = await payload.findByID({
    collection: 'games',
    id: gameId,
    select: { ...CARD_SELECT, contactPhone: true },
    populate: CARD_POPULATE,
    depth: 2,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!doc) return null

  const game = normalizeGameRecord(doc, now)
  const [previews, joined] = await Promise.all([
    findParticipantPreviews(payload, [gameId]),
    viewerId === null
      ? false
      : payload
          .count({
            collection: 'game-participants',
            where: { and: [{ game: { equals: gameId } }, { user: { equals: viewerId } }] },
            overrideAccess: true,
          })
          .then(({ totalDocs }) => totalDocs > 0),
  ])
  const hostId = typeof doc.host === 'object' ? doc.host?.id : doc.host
  const isHost = viewerId !== null && hostId === viewerId

  return {
    ...toGameCard(game),
    host: { ...game.host, phone: joined || isHost ? doc.contactPhone ?? null : null },
    participants: { preview: previews.get(String(gameId)) ?? [], total: game.currentCount },
    viewer: { joined, isHost },
  }
}

type CreateGameResult =
  | { ok: true; game: NonNullable<Awaited<ReturnType<typeof getGameDetail>>> }
  | { ok: false; code: string; message: string }

/** Creates a game hosted by the signed-in user from a validated create-game form. */
export async function createGame(host: { id: number; phoneNumber?: string | null }, input: CreateGameInput): Promise<CreateGameResult> {
  const payload = await getPayloadClient()
  const venue = await payload.findByID({
    collection: 'arenas',
    id: input.venueId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!venue) return { ok: false, code: 'VENUE_NOT_FOUND', message: 'Meydança tapılmadı.' }
  if (venue.sportTypes?.length && !venue.sportTypes.includes(input.sport as (typeof venue.sportTypes)[number])) {
    return { ok: false, code: 'VENUE_SPORT_MISMATCH', message: 'Bu meydançada seçilmiş idman növü oynanmır.' }
  }

  // The design reveals this number to players after they join ("Bir addım qaldı").
  const contactPhone = input.contactPhone ?? normalizePhone(host.phoneNumber)
  if (!contactPhone) return { ok: false, code: 'PHONE_REQUIRED', message: 'Host telefon nömrəsi tələb olunur.' }

  // One transaction: the game and its first player, the host, are created together or not at all.
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req = { transactionID }
  let gameId: number
  try {
    const created = await payload.create({
      collection: 'games',
      overrideAccess: true,
      req,
      data: {
        title: input.title,
        sport: input.sport as 'football' | 'basketball' | 'tennis',
        level: input.level as 'beginner' | 'medium' | 'high',
        arena: venue.id,
        host: host.id,
        scheduledAt: input.scheduledAt.toISOString(),
        maxPlayers: input.maxCount,
        // currentCount includes the host (parseCreateGameBody), so the host's spot is already taken.
        availablePlayers: input.maxCount - input.currentCount,
        contactPhone,
        status: 'scheduled',
      },
    })
    await payload.create({
      collection: 'game-participants',
      overrideAccess: true,
      req,
      data: { game: created.id, user: host.id, phone: contactPhone },
    })
    if (transactionID !== undefined) await payload.db.commitTransaction(transactionID)
    gameId = created.id
  } catch (error) {
    if (transactionID !== undefined) await payload.db.rollbackTransaction(transactionID)
    throw error
  }
  // The collection hooks already expired the cache, but before the commit; a read in between could refill it.
  invalidateGamesCache()

  const game = await getGameDetail(gameId, host.id)
  if (!game) throw new Error(`Game ${gameId} disappeared right after creation`)
  return { ok: true, game }
}

const findVenues = unstable_cache(
  async (city: string) => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'arenas',
      where: cityWhere('city', city),
      select: { name: true, location: true, city: true, district: true, address: true, coordinates: true, sportTypes: true },
      sort: 'name',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    return docs
  },
  ['venues'],
  { tags: [GAMES_CACHE_TAG], revalidate: CACHE_SECONDS },
)

/** Venue picker options. Venues without sport types listed are offered for every sport. */
export async function listVenues(city: string, sport: string | null, search: string | null) {
  const needle = search?.trim() ? foldForSearch(search.trim()) : null
  return (await findVenues(city))
    .map((doc) => normalizeVenue(doc))
    .filter((venue) => !sport || venue.sportTypes.length === 0 || venue.sportTypes.includes(sport))
    .filter((venue) => !needle || [venue.name, venue.district, venue.address].some((text) => text && foldForSearch(text).includes(needle)))
}
