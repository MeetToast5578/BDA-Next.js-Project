import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, Where } from 'payload'

import { invalidateGamesCache } from '@/lib/cache-tags'
import {
  SPORT_META,
  SPORTS,
  formatBakuMonthYear,
  initialsOf,
  normalizeGameRecord,
  toGameCard,
  userAvatarUrl,
  type MyGamesQuery,
  type ProfileUpdate,
} from '@/lib/game-backend'
import { getPayloadClient } from '@/lib/game-queries'

/**
 * A profile is always read for one signed-in person, so nothing here is cached: it would key on the
 * viewer and the entries would never be reused.
 */

/** Participations are read in one go rather than paged; a player has tens of games, not thousands. */
// ponytail: unbounded read of one user's participations, fine at MVP scale. If someone ever joins
// thousands of games, page this query instead of pulling every row.
const MAX_PARTICIPATIONS = 500

function upcomingWhere(when: MyGamesQuery['when'], now: Date): Where {
  return when === 'upcoming'
    ? { and: [{ scheduledAt: { greater_than: now.toISOString() } }, { status: { equals: 'scheduled' } }] }
    : { scheduledAt: { less_than_equal: now.toISOString() } }
}

/**
 * Games that count as played in the stats: over, and not called off. The "past" lists still show
 * cancelled games, labelled as such, but nobody played them.
 */
function playedWhere(now: Date): Where {
  return { and: [upcomingWhere('past', now), { status: { not_equals: 'cancelled' } }] }
}

/** Game ids this user holds a participant row for, newest participation first. */
async function participatedGameIds(payload: Payload, userId: number) {
  const { docs } = await payload.find({
    collection: 'game-participants',
    where: { user: { equals: userId } },
    select: { game: true },
    depth: 0,
    limit: MAX_PARTICIPATIONS,
    pagination: false,
    overrideAccess: true,
  })
  return docs
    .map((doc) => (typeof doc.game === 'object' ? doc.game?.id : doc.game))
    .filter((id): id is number => typeof id === 'number')
}

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

const EMPTY_LIST = {
  games: [],
  pagination: { page: 1, limit: 0, totalDocs: 0, totalPages: 0, hasNextPage: false },
}

/**
 * "Mənim oyunlarım" — the same card shape as `GET /api/v1/games`, so the profile page renders them
 * with the components it already has instead of re-deriving status and labels.
 */
export async function findMyGames(userId: number, query: MyGamesQuery, now = new Date()) {
  const payload = await getPayloadClient()

  let idFilter: Where | null = null
  if (query.role === 'joined') {
    const ids = await participatedGameIds(payload, userId)
    if (ids.length === 0) return { ...EMPTY_LIST, pagination: { ...EMPTY_LIST.pagination, limit: query.limit } }
    // A host is a participant in their own game, but those belong under "hosting".
    idFilter = { and: [{ id: { in: ids } }, { host: { not_equals: userId } }] }
  }

  const result = await payload.find({
    collection: 'games',
    where: {
      and: [
        upcomingWhere(query.when, now),
        ...(query.role === 'hosting' ? [{ host: { equals: userId } } as Where] : []),
        ...(idFilter ? [idFilter] : []),
      ],
    },
    select: CARD_SELECT,
    populate: CARD_POPULATE,
    // Upcoming games read forwards from now; past ones read backwards from the most recent.
    sort: query.when === 'upcoming' ? 'scheduledAt' : '-scheduledAt',
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

/**
 * How many games the user hosts and has joined. The upcoming counts match the "Qarşıdakı" lists; the
 * past ones (`hostedPast`, `played`) leave out cancelled games, which nobody played.
 */
async function countGames(payload: Payload, userId: number, now: Date) {
  const joinedIds = await participatedGameIds(payload, userId)
  const notHostedByMe: Where[] = [{ host: { not_equals: userId } }]

  const count = async (where: Where) =>
    (await payload.count({ collection: 'games', where, overrideAccess: true })).totalDocs

  const joinedWhere = (window: Where): Where =>
    joinedIds.length === 0
      ? { id: { equals: -1 } }
      : { and: [{ id: { in: joinedIds } }, ...notHostedByMe, window] }

  const [hostingUpcoming, hostedPast, joinedUpcoming, played] = await Promise.all([
    count({ and: [{ host: { equals: userId } }, upcomingWhere('upcoming', now)] }),
    count({ and: [{ host: { equals: userId } }, playedWhere(now)] }),
    count(joinedWhere(upcomingWhere('upcoming', now))),
    count(joinedWhere(playedWhere(now))),
  ])

  return { hostingUpcoming, hostedPast, joinedUpcoming, played, joinedIds }
}

/**
 * Games actually played, hosted or joined, broken down by sport, for the profile's stats panel.
 * The per-sport counts add up to `played + hostedPast`.
 */
async function playedBySport(payload: Payload, userId: number, joinedIds: number[], now: Date) {
  const counts = Object.fromEntries(SPORTS.map((sport) => [sport, 0])) as Record<string, number>
  const ids = joinedIds.length ? joinedIds : []

  const { docs } = await payload.find({
    collection: 'games',
    where: {
      and: [
        { or: [{ host: { equals: userId } }, ...(ids.length ? [{ id: { in: ids } } as Where] : [])] },
        playedWhere(now),
      ],
    },
    select: { sport: true },
    depth: 0,
    limit: MAX_PARTICIPATIONS,
    pagination: false,
    overrideAccess: true,
  })

  for (const doc of docs) {
    const sport = String(doc.sport)
    if (sport in counts) counts[sport] += 1
  }

  return SPORTS.map((sport) => ({
    sport,
    label: SPORT_META[sport].label,
    iconKey: SPORT_META[sport].iconKey,
    playedCount: counts[sport],
  }))
}

/** The signed-in user's own profile: identity, counts and stats in one request. */
export async function getMyProfile(userId: number, now = new Date()) {
  const payload = await getPayloadClient()
  const user = await payload.findByID({
    collection: 'users',
    id: userId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!user) return null

  const counts = await countGames(payload, userId, now)
  const bySport = await playedBySport(payload, userId, counts.joinedIds, now)
  const fullName = user.fullName?.trim() || user.email

  return {
    id: String(user.id),
    fullName,
    firstName: fullName.split(/\s+/)[0],
    initials: initialsOf(fullName),
    email: user.email,
    phoneNumber: user.phoneNumber ?? null,
    avatarUrl: userAvatarUrl(user),
    memberSince: user.createdAt,
    memberSinceLabel: formatBakuMonthYear(user.createdAt),
    counts: {
      hostingUpcoming: counts.hostingUpcoming,
      hostedPast: counts.hostedPast,
      joinedUpcoming: counts.joinedUpcoming,
      played: counts.played,
    },
    stats: {
      /** Every game played, hosted or joined: the sum of `playedBySport`. */
      totalPlayed: bySport.reduce((sum, sport) => sum + sport.playedCount, 0),
      playedBySport: bySport,
    },
  }
}

export type MyProfile = NonNullable<Awaited<ReturnType<typeof getMyProfile>>>

type UpdateResult = { ok: true; profile: MyProfile } | { ok: false; code: string; message: string }

/** Applies a validated profile edit. Phone numbers are unique, so a clash is reported as such. */
export async function updateMyProfile(userId: number, update: ProfileUpdate): Promise<UpdateResult> {
  const payload = await getPayloadClient()

  if (update.profilePictureId != null) {
    const media = await payload.findByID({
      collection: 'media',
      id: update.profilePictureId,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })
    if (!media) return { ok: false, code: 'MEDIA_NOT_FOUND', message: 'Şəkil tapılmadı.' }
  }

  if (update.phone) {
    const clash = await payload.find({
      collection: 'users',
      where: { and: [{ phoneNumber: { equals: update.phone } }, { id: { not_equals: userId } }] },
      select: { phoneNumber: true },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (clash.totalDocs > 0) {
      return { ok: false, code: 'PHONE_TAKEN', message: 'Bu nömrə başqa hesabda istifadə olunur.' }
    }
  }

  await payload.update({
    collection: 'users',
    id: userId,
    overrideAccess: true,
    data: {
      ...(update.fullName !== undefined ? { fullName: update.fullName } : {}),
      ...(update.phone !== undefined ? { phoneNumber: update.phone } : {}),
      ...(update.profilePictureId !== undefined ? { profilePicture: update.profilePictureId } : {}),
    },
  })
  // The host's name and picture are shown on every card they host.
  invalidateGamesCache()

  const profile = await getMyProfile(userId)
  if (!profile) return { ok: false, code: 'USER_NOT_FOUND', message: 'İstifadəçi tapılmadı.' }
  return { ok: true, profile }
}

/**
 * Deletes an account and everything that would otherwise point at nothing.
 *
 * `games.host_id` and `game_participants.user_id` are both ON DELETE SET NULL, so removing the user
 * alone would leave hosted games with no host — a required field — which nobody could then edit or
 * delete, still listed and still carrying a contact number. Their games go with them, and so do the
 * participant rows of those games and this user's own participations, whose spots in upcoming games
 * are handed back. One transaction, all or nothing.
 */
export async function deleteMyAccount(userId: number) {
  const payload = await getPayloadClient()

  const hosted = await payload.find({
    collection: 'games',
    where: { host: { equals: userId } },
    select: { title: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const hostedIds = hosted.docs.map((doc) => doc.id)

  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req = { transactionID }
  try {
    if (hostedIds.length > 0) {
      await payload.delete({
        collection: 'game-participants',
        where: { game: { in: hostedIds } },
        overrideAccess: true,
        req,
      })
      await payload.delete({ collection: 'games', where: { id: { in: hostedIds } }, overrideAccess: true, req })
    }
    // Spots this user held in other people's games that have not started go back to those games, as
    // if they had left each one ("Oyundan çıx"); past games keep their numbers as they were played.
    // Runs before the participant rows go, since it finds the games through them. LEAST keeps a
    // game from ever showing more free spots than it has places.
    const adapter = payload.db as unknown as PostgresAdapter
    const db = (transactionID !== undefined ? adapter.sessions[String(transactionID)]?.db : undefined) ?? adapter.drizzle
    await db.execute(sql`
      UPDATE games
      SET available_players = LEAST(games.available_players + 1, games.max_players), updated_at = now()
      FROM game_participants
      WHERE game_participants.game_id = games.id
        AND game_participants.user_id = ${userId}
        AND games.host_id IS DISTINCT FROM ${userId}
        AND games.status = 'scheduled'
        AND games.scheduled_at > now()
    `)
    await payload.delete({
      collection: 'game-participants',
      where: { user: { equals: userId } },
      overrideAccess: true,
      req,
    })
    await payload.delete({ collection: 'users', id: userId, overrideAccess: true, req })
    if (transactionID !== undefined) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID !== undefined) await payload.db.rollbackTransaction(transactionID)
    throw error
  }
  invalidateGamesCache()

  return { deletedGames: hostedIds.length }
}

/**
 * Another player's public profile — what a game card already reveals about a host, plus the games
 * they are running. Never their email or phone: the host's number stays gated behind joining.
 */
export async function getPublicProfile(userId: number, now = new Date()) {
  const payload = await getPayloadClient()
  const user = await payload.findByID({
    collection: 'users',
    id: userId,
    select: { fullName: true, profilePicture: true, avatarUrl: true, createdAt: true },
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!user) return null

  const [hosting, hostedPast] = await Promise.all([
    payload.find({
      collection: 'games',
      where: { and: [{ host: { equals: userId } }, upcomingWhere('upcoming', now)] },
      select: CARD_SELECT,
      populate: CARD_POPULATE,
      sort: 'scheduledAt',
      limit: 20,
      depth: 2,
      overrideAccess: true,
    }),
    payload.count({
      collection: 'games',
      where: { and: [{ host: { equals: userId } }, playedWhere(now)] },
      overrideAccess: true,
    }),
  ])

  const fullName = user.fullName?.trim() || 'OyunaGəl istifadəçisi'
  return {
    id: String(user.id),
    fullName,
    firstName: fullName.split(/\s+/)[0],
    initials: initialsOf(fullName),
    avatarUrl: userAvatarUrl(user),
    memberSince: user.createdAt,
    memberSinceLabel: formatBakuMonthYear(user.createdAt),
    counts: { hostingUpcoming: hosting.totalDocs, hostedPast: hostedPast.totalDocs },
    hostedGames: hosting.docs.map((doc) => toGameCard(normalizeGameRecord(doc, now.getTime()))),
  }
}
