export type AvailabilityStatus = 'open' | 'full' | 'scheduled' | 'live' | 'finished' | 'cancelled'

const SPORT_META: Record<string, { label: string; icon: string; image: string }> = {
  football: { label: 'Futbol', icon: '⚽', image: '/images/game-football-1-7880cc.png' },
  basketball: { label: 'Basketbol', icon: '🏀', image: '/images/game-basketball-1-4a0ddf.png' },
  tennis: { label: 'Tennis', icon: '🎾', image: '/images/game-tennis-1-3ee73d.png' },
}

const LEVEL_META: Record<string, string> = {
  beginner: 'Başlanğıc',
  medium: 'Orta səviyyə',
  high: 'Yüksək',
}

export function deriveAvailability(raw: Record<string, unknown> | null | undefined) {
  const maxPlayers = Number(raw?.maxPlayers ?? 0)
  const availablePlayers = Number(raw?.availablePlayers ?? maxPlayers)
  const remainingSpots = Number.isFinite(availablePlayers) ? Math.max(0, availablePlayers) : 0

  const status: AvailabilityStatus =
    raw?.status === 'cancelled'
      ? 'cancelled'
      : raw?.status === 'finished'
        ? 'finished'
        : raw?.status === 'live'
          ? 'live'
          : remainingSpots > 0
            ? 'open'
            : 'full'

  return {
    remainingSpots,
    status,
  }
}

export function formatRelativeTime(dateInput?: string | Date | null) {
  if (!dateInput) return 'Təyin edilmədi'

  const eventDate = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(eventDate.getTime())) return 'Təyin edilmədi'

  const diffMs = eventDate.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  if (Math.abs(diffMinutes) < 60) {
    if (diffMinutes === 0) return 'İndi'
    return diffMinutes > 0 ? `${Math.abs(diffMinutes)} dəq sonra` : `${Math.abs(diffMinutes)} dəq əvvəl`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `${Math.abs(diffHours)} saat sonra` : `${Math.abs(diffHours)} saat əvvəl`
  }

  const diffDays = Math.round(diffHours / 24)
  return diffDays > 0 ? `${Math.abs(diffDays)} gün sonra` : `${Math.abs(diffDays)} gün əvvəl`
}

export function normalizeGameRecord(raw: Record<string, unknown> | null | undefined) {
  const sportValue = String(raw?.sport ?? 'football')
  const sportMeta = SPORT_META[sportValue] ?? SPORT_META.football
  const arena = (raw?.arena && typeof raw.arena === 'object') ? raw.arena as Record<string, unknown> : {}
  const host = (raw?.host && typeof raw.host === 'object') ? raw.host as Record<string, unknown> : {}
  const availability = deriveAvailability(raw)
  const maxPlayers = Number(raw?.maxPlayers ?? 0)
  const availablePlayers = Number(raw?.availablePlayers ?? Math.max(0, maxPlayers))
  const currentPlayers = Math.max(0, maxPlayers - availablePlayers)
  const venue = {
    name: String(arena.name ?? 'Inter Arena'),
    district: String(arena.district ?? arena.location ?? 'Nərimanov'),
    address: String(arena.address ?? arena.location ?? 'Nərimanov, Bakı'),
    coordinates: typeof arena.coordinates === 'string' ? arena.coordinates : null,
    sportTypes: Array.isArray(arena.sportTypes) ? arena.sportTypes : [sportValue],
  }

  const coverImageUrl = typeof raw?.coverImageUrl === 'string' && raw.coverImageUrl
    ? raw.coverImageUrl
    : typeof raw?.image === 'string' && raw.image
      ? raw.image
      : sportMeta.image

  return {
    id: String(raw?.id ?? ''),
    title: String(raw?.title ?? 'Oyun'),
    sport: sportValue,
    sportLabel: sportMeta.label,
    icon: sportMeta.icon,
    level: String(raw?.level ?? 'medium'),
    levelLabel: LEVEL_META[String(raw?.level ?? 'medium')] ?? 'Orta səviyyə',
    venue,
    startsAt: raw?.scheduledAt ? String(raw.scheduledAt) : null,
    scheduledAt: raw?.scheduledAt ? String(raw.scheduledAt) : null,
    coverImageUrl,
    image: coverImageUrl,
    hostName: String(host['Full Name'] ?? host.email ?? 'OyunaGəl istifadəçisi'),
    hostEmail: host.email ? String(host.email) : null,
    maxPlayers,
    availablePlayers,
    currentPlayers,
    remainingSpots: availability.remainingSpots,
    status: raw?.status ? String(raw.status) : 'scheduled',
    availability,
    relativeTimeLabel: formatRelativeTime(raw?.scheduledAt ? String(raw.scheduledAt) : null),
    homeScore: Number(raw?.homeScore ?? 0),
    awayScore: Number(raw?.awayScore ?? 0),
  }
}

export async function getGameDocs() {
  const { getPayload } = await import('payload')
  const config = (await import('@/payload.config')).default
  const payload = await getPayload({ config }) as {
    find: (options: {
      collection: string
      limit?: number
      overrideAccess?: boolean
      sort?: string
      depth?: number
    }) => Promise<{ docs?: Record<string, unknown>[] }>
  }

  const response = await payload.find({
    collection: 'games',
    limit: 200,
    sort: 'scheduledAt',
    depth: 2,
    overrideAccess: true,
  })

  return (response.docs ?? []).map((doc) => normalizeGameRecord(doc))
}
