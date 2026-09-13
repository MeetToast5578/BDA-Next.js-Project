// Pure game logic shared by the API routes, collections and tests. No Payload or Next imports here.

export type AvailabilityStatus = 'open' | 'full' | 'closed' | 'live' | 'finished' | 'cancelled'

type Doc = Record<string, unknown>

/** Asia/Baku has not observed daylight saving time since 2016, so its offset is fixed. */
export const BAKU_TIME_ZONE = 'Asia/Baku'
export const BAKU_UTC_OFFSET = '+04:00'

export const DEFAULT_CITY = 'baku'
export const CITY_OPTIONS = [{ label: 'Bakı', value: 'baku' }]
const CITY_ALIASES: Record<string, string> = { baku: 'baku', bakı: 'baku', baki: 'baku' }

export const SPORT_META: Record<string, { label: string; iconKey: string; image: string }> = {
  football: { label: 'Futbol', iconKey: 'football', image: '/images/game-football-1-7880cc.png' },
  basketball: { label: 'Basketbol', iconKey: 'basketball', image: '/images/game-basketball-1-4a0ddf.png' },
  tennis: { label: 'Tennis', iconKey: 'tennis', image: '/images/game-tennis-1-3ee73d.png' },
}
export const SPORTS = Object.keys(SPORT_META)

export const FEATURED_LIMIT = 8
/** Only games starting within this many hours are considered for the hero carousel. */
export const FEATURED_WINDOW_HOURS = 7 * 24

export const GAMES_DEFAULT_LIMIT = 12
export const GAMES_MAX_LIMIT = 50

const DEFAULT_HOST_NAME = 'OyunaGəl istifadəçisi'
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function asDoc(value: unknown): Doc | null {
  return value && typeof value === 'object' ? (value as Doc) : null
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

/** Coerces a stored player count to a non-negative integer; anything unparseable counts as 0. */
function toCount(value: unknown) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

/**
 * The single source of truth for whether a game can be joined. Clients must use the returned
 * `status` / `remainingSpots` instead of re-deriving them from the player counts.
 */
export function deriveAvailability(raw: unknown, now = Date.now()) {
  const game = asDoc(raw) ?? {}
  const maxCount = toCount(game.maxPlayers)
  const remainingSpots = Math.min(toCount(game.availablePlayers ?? maxCount), maxCount)
  const startsAt = game.scheduledAt ? Date.parse(String(game.scheduledAt)) : Number.NaN

  let status: AvailabilityStatus
  if (game.status === 'cancelled' || game.status === 'finished' || game.status === 'live') {
    status = game.status
  } else if (startsAt <= now) {
    status = 'closed'
  } else {
    status = remainingSpots > 0 ? 'open' : 'full'
  }

  return { status, remainingSpots, currentCount: maxCount - remainingSpots, maxCount }
}

const bakuDayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: BAKU_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const bakuTime = new Intl.DateTimeFormat('az-AZ', { timeZone: BAKU_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const bakuWeekday = new Intl.DateTimeFormat('az-AZ', { timeZone: BAKU_TIME_ZONE, weekday: 'long' })
const bakuDate = new Intl.DateTimeFormat('az-AZ', { timeZone: BAKU_TIME_ZONE, day: 'numeric', month: 'long' })

/** Midnight in Baku of the day containing `date`, shifted by `addDays` days. */
export function startOfBakuDay(date: Date, addDays = 0) {
  const start = new Date(`${bakuDayKey.format(date)}T00:00:00${BAKU_UTC_OFFSET}`)
  return new Date(start.getTime() + addDays * DAY_MS)
}

/** "Bu gün · 17:00", "Sabah · 19:30", "Cümə axşamı · 17:00", or "1 oktyabr · 17:00", in Baku time. */
export function formatBakuLabel(dateInput?: string | Date | null, now = new Date()) {
  if (!dateInput) return 'Təyin edilmədi'
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return 'Təyin edilmədi'

  const dayOffset = Math.round((startOfBakuDay(date).getTime() - startOfBakuDay(now).getTime()) / DAY_MS)
  let dayLabel: string
  if (dayOffset === 0) dayLabel = 'Bu gün'
  else if (dayOffset === 1) dayLabel = 'Sabah'
  else if (dayOffset > 1 && dayOffset < 7) dayLabel = capitalize(bakuWeekday.format(date))
  else dayLabel = bakuDate.format(date)

  return `${dayLabel} · ${bakuTime.format(date)}`
}

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase('az') + text.slice(1)
}

/** Maps a `city` query value to a stored city, defaulting to Baku; returns null for unknown cities. */
export function normalizeCity(input?: string | null) {
  if (!input?.trim()) return DEFAULT_CITY
  return CITY_ALIASES[input.trim().toLocaleLowerCase('az')] ?? null
}

/** Parses "lat,lng" into numbers; null when missing or out of range. */
export function parseCoordinates(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const parts = value.split(',').map((part) => Number(part.trim()))
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) return null
  const [lat, lng] = parts
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

/** Prefixes uploaded-media paths with MEDIA_BASE_URL (a CDN in front of the app) when it is set. */
export function mediaUrl(url: unknown) {
  if (!nonEmptyString(url)) return null
  const base = process.env.MEDIA_BASE_URL?.replace(/\/+$/, '')
  return base && (url as string).startsWith('/') ? `${base}${url}` : (url as string)
}

export function initialsOf(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('az'))
    .join('')
  return initials || '?'
}

function normalizeVenue(value: unknown) {
  const arena = asDoc(value)
  const id = arena ? arena.id : value
  return {
    id: typeof id === 'number' || typeof id === 'string' ? String(id) : null,
    name: nonEmptyString(arena?.name) ?? '',
    district: nonEmptyString(arena?.district),
    address: nonEmptyString(arena?.address) ?? nonEmptyString(arena?.location),
    city: nonEmptyString(arena?.city) ?? DEFAULT_CITY,
    coordinates: parseCoordinates(arena?.coordinates),
    sportTypes: Array.isArray(arena?.sportTypes) ? arena.sportTypes.map(String) : [],
  }
}

function resolveCoverImage(game: Doc, fallbackUrl: string) {
  const media = asDoc(game.coverImage)
  const sizes = asDoc(media?.sizes)
  const fullUrl =
    mediaUrl(asDoc(sizes?.full)?.url) ?? mediaUrl(media?.url) ?? nonEmptyString(game.image) ?? fallbackUrl
  const thumbnailUrl = mediaUrl(asDoc(sizes?.thumbnail)?.url) ?? fullUrl
  return { thumbnailUrl, fullUrl, fallbackUrl }
}

export function normalizeGameRecord(raw: unknown, now = Date.now()) {
  const game = asDoc(raw) ?? {}
  const sport = String(game.sport ?? 'football')
  const sportMeta = SPORT_META[sport] ?? SPORT_META.football
  const host = asDoc(game.host)

  return {
    id: String(game.id ?? ''),
    title: String(game.title ?? 'Oyun'),
    sport,
    level: String(game.level ?? 'medium'),
    venue: normalizeVenue(game.arena),
    startsAt: game.scheduledAt ? String(game.scheduledAt) : null,
    ...deriveAvailability(game, now),
    cover: resolveCoverImage(game, sportMeta.image),
    host: {
      name: nonEmptyString(host?.fullName) ?? DEFAULT_HOST_NAME,
      avatarUrl: mediaUrl(asDoc(host?.profilePicture)?.url),
    },
  }
}

export type GameRecord = ReturnType<typeof normalizeGameRecord>

/** The card shape shared by GET /api/games and GET /api/games/featured. */
export function toGameCard(game: GameRecord) {
  return {
    id: game.id,
    title: game.title,
    sport: game.sport,
    level: game.level,
    venue: game.venue,
    district: game.venue.district,
    startsAt: game.startsAt,
    currentCount: game.currentCount,
    maxCount: game.maxCount,
    remainingSpots: game.remainingSpots,
    status: game.status,
    coverImageUrl: game.cover.fullUrl,
    coverImage: game.cover,
    host: game.host,
  }
}

/** One entry per known sport, including sports with no open games, so tab counters never go missing. */
export function countOpenGamesBySport(games: Array<{ sport: string; status: AvailabilityStatus }>) {
  const counts = new Map<string, number>()
  for (const game of games) {
    if (game.status === 'open') counts.set(game.sport, (counts.get(game.sport) ?? 0) + 1)
  }
  return SPORTS.map((sport) => ({
    sport,
    iconKey: SPORT_META[sport].iconKey,
    openGamesCount: counts.get(sport) ?? 0,
  }))
}

type Rankable = { status: AvailabilityStatus; startsAt: string | null; currentCount: number; maxCount: number }

/**
 * Urgency score in [0, 1]: 60% how soon the game starts (linear over FEATURED_WINDOW_HOURS),
 * 40% how full it is. Documented in docs/api.md.
 */
export function featuredScore(game: Rankable, now: number) {
  const startsAtMs = game.startsAt ? Date.parse(game.startsAt) : Number.NaN
  const hoursUntilStart = Number.isFinite(startsAtMs) ? (startsAtMs - now) / HOUR_MS : FEATURED_WINDOW_HOURS
  const timeScore = Math.min(1, Math.max(0, 1 - hoursUntilStart / FEATURED_WINDOW_HOURS))
  const fillRatio = game.maxCount > 0 ? game.currentCount / game.maxCount : 0
  return 0.6 * timeScore + 0.4 * fillRatio
}

/** Open games only, highest score first, ties broken by the earlier start. */
export function rankFeatured<T extends Rankable>(games: T[], now: number, limit = FEATURED_LIMIT) {
  return games
    .filter((game) => game.status === 'open')
    .map((game) => ({ game, score: featuredScore(game, now) }))
    .sort((a, b) => b.score - a.score || (a.game.startsAt ?? '').localeCompare(b.game.startsAt ?? ''))
    .slice(0, limit)
    .map(({ game }) => game)
}

export type GameListQuery = {
  sport: string | null
  city: string
  from: Date
  to: Date
  onlyOpen: boolean
  page: number
  limit: number
}

type ParseResult = { ok: true; query: GameListQuery } | { ok: false; code: string; message: string }

/** Validates GET /api/games query params. Defaults to the homepage window: now until the end of tomorrow in Baku. */
export function parseGameListParams(params: URLSearchParams, now = new Date()): ParseResult {
  const sport = params.get('sport')
  if (sport && !SPORTS.includes(sport)) {
    return { ok: false, code: 'INVALID_SPORT', message: `sport must be one of: ${SPORTS.join(', ')}` }
  }

  const city = normalizeCity(params.get('city'))
  if (!city) return { ok: false, code: 'UNKNOWN_CITY', message: 'Unknown city.' }

  const from = parseDateParam(params.get('from'), now)
  const to = parseDateParam(params.get('to'), startOfBakuDay(now, 2))
  if (!from || !to) return { ok: false, code: 'INVALID_DATE', message: 'from and to must be ISO 8601 timestamps.' }

  const status = params.get('status')
  if (status && status !== 'open') return { ok: false, code: 'INVALID_STATUS', message: 'status only accepts "open".' }

  return {
    ok: true,
    query: {
      sport,
      city,
      // Games that already started can't be joined, so the window never reaches into the past.
      from: from < now ? now : from,
      to,
      onlyOpen: status === 'open',
      page: clampInt(params.get('page'), 1, 1, Number.MAX_SAFE_INTEGER),
      limit: clampInt(params.get('limit'), GAMES_DEFAULT_LIMIT, 1, GAMES_MAX_LIMIT),
    },
  }
}

function parseDateParam(value: string | null, fallback: Date) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = value === null ? Number.NaN : Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}
