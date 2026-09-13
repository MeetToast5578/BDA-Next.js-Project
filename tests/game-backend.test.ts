import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  countOpenGamesBySport,
  deriveAvailability,
  formatBakuLabel,
  initialsOf,
  normalizeCity,
  normalizeGameRecord,
  parseCoordinates,
  parseGameListParams,
  rankFeatured,
  startOfBakuDay,
  toGameCard,
} from '@/lib/game-backend'

const HOUR_MS = 60 * 60 * 1000
// Sunday 13 September 2026, 14:00 in Baku.
const NOW = Date.parse('2026-09-13T10:00:00Z')
const inHours = (hours: number) => new Date(NOW + hours * HOUR_MS).toISOString()

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('deriveAvailability', () => {
  const game = (overrides: Record<string, unknown> = {}) => ({
    status: 'scheduled',
    scheduledAt: inHours(3),
    maxPlayers: 10,
    availablePlayers: 5,
    ...overrides,
  })

  it('is full with 0 spots left', () => {
    expect(deriveAvailability(game({ availablePlayers: 0 }), NOW)).toEqual({
      status: 'full',
      remainingSpots: 0,
      currentCount: 10,
      maxCount: 10,
    })
  })

  it('is open with exactly 1 spot left', () => {
    expect(deriveAvailability(game({ availablePlayers: 1 }), NOW)).toEqual({
      status: 'open',
      remainingSpots: 1,
      currentCount: 9,
      maxCount: 10,
    })
  })

  it('caps overflowing availablePlayers at maxPlayers', () => {
    expect(deriveAvailability(game({ availablePlayers: 15 }), NOW)).toEqual({
      status: 'open',
      remainingSpots: 10,
      currentCount: 0,
      maxCount: 10,
    })
  })

  it('treats negative or non-numeric counts as no spots', () => {
    expect(deriveAvailability(game({ availablePlayers: -3 }), NOW).status).toBe('full')
    expect(deriveAvailability(game({ availablePlayers: 'abc' }), NOW).remainingSpots).toBe(0)
    expect(deriveAvailability(game({ maxPlayers: null, availablePlayers: 4 }), NOW)).toMatchObject({
      status: 'full',
      remainingSpots: 0,
      maxCount: 0,
    })
  })

  it('defaults a missing availablePlayers to every spot free', () => {
    expect(deriveAvailability(game({ availablePlayers: undefined }), NOW).remainingSpots).toBe(10)
  })

  it('closes games whose start time has passed', () => {
    expect(deriveAvailability(game({ scheduledAt: inHours(-1) }), NOW).status).toBe('closed')
    expect(deriveAvailability(game({ scheduledAt: new Date(NOW).toISOString() }), NOW).status).toBe('closed')
  })

  it.each(['cancelled', 'finished', 'live'])('keeps the %s status even with spots left', (status) => {
    expect(deriveAvailability(game({ status }), NOW).status).toBe(status)
  })
})

describe('formatBakuLabel', () => {
  it('labels today, tomorrow, this week and later in Baku time', () => {
    const now = new Date(NOW)
    expect(formatBakuLabel('2026-09-13T13:00:00Z', now)).toBe('Bu gün · 17:00')
    expect(formatBakuLabel('2026-09-14T15:30:00Z', now)).toBe('Sabah · 19:30')
    expect(formatBakuLabel('2026-09-17T13:00:00Z', now)).toBe('Cümə axşamı · 17:00')
    expect(formatBakuLabel('2026-10-01T13:00:00Z', now)).toBe('1 oktyabr · 17:00')
  })

  it('uses the Baku calendar day, not the UTC one', () => {
    // 20:30 UTC on the 13th is already 00:30 on the 14th in Baku.
    expect(formatBakuLabel('2026-09-13T20:30:00Z', new Date(NOW))).toBe('Sabah · 00:30')
    // At 01:00 Baku (21:00 UTC the previous day), a 02:00 Baku game is today.
    expect(formatBakuLabel('2026-09-13T22:00:00Z', new Date('2026-09-13T21:00:00Z'))).toBe('Bu gün · 02:00')
  })

  it('handles missing and invalid dates', () => {
    expect(formatBakuLabel(null)).toBe('Təyin edilmədi')
    expect(formatBakuLabel('not a date')).toBe('Təyin edilmədi')
  })
})

describe('startOfBakuDay', () => {
  it('returns midnight in Baku', () => {
    expect(startOfBakuDay(new Date(NOW)).toISOString()).toBe('2026-09-12T20:00:00.000Z')
    expect(startOfBakuDay(new Date(NOW), 2).toISOString()).toBe('2026-09-14T20:00:00.000Z')
  })
})

describe('countOpenGamesBySport', () => {
  it('counts only open games and lists every sport', () => {
    expect(
      countOpenGamesBySport([
        { sport: 'football', status: 'open' },
        { sport: 'football', status: 'open' },
        { sport: 'football', status: 'full' },
        { sport: 'tennis', status: 'closed' },
        { sport: 'curling', status: 'open' },
      ]),
    ).toEqual([
      { sport: 'football', iconKey: 'football', openGamesCount: 2 },
      { sport: 'basketball', iconKey: 'basketball', openGamesCount: 0 },
      { sport: 'tennis', iconKey: 'tennis', openGamesCount: 0 },
    ])
  })
})

describe('rankFeatured', () => {
  const game = (id: string, hours: number, currentCount: number, status: 'open' | 'full' | 'closed' = 'open') => ({
    id,
    status,
    startsAt: inHours(hours),
    currentCount,
    maxCount: 10,
  })

  it('ranks sooner and fuller games first and skips unjoinable ones', () => {
    const ranked = rankFeatured(
      [
        game('far-empty', 150, 0),
        game('soon-half', 2, 5),
        game('soon-almost-full', 2, 9),
        game('full', 1, 10, 'full'),
        game('started', -1, 5, 'closed'),
      ],
      NOW,
    )
    expect(ranked.map((g) => g.id)).toEqual(['soon-almost-full', 'soon-half', 'far-empty'])
  })

  it('returns at most the limit', () => {
    const games = Array.from({ length: 12 }, (_, i) => game(`g${i}`, i + 1, 3))
    expect(rankFeatured(games, NOW)).toHaveLength(8)
    expect(rankFeatured(games, NOW, 3).map((g) => g.id)).toEqual(['g0', 'g1', 'g2'])
  })
})

describe('normalizeCity', () => {
  it('defaults to Baku and accepts its spellings', () => {
    expect(normalizeCity(null)).toBe('baku')
    expect(normalizeCity('')).toBe('baku')
    expect(normalizeCity('Bakı')).toBe('baku')
    expect(normalizeCity('BAKI')).toBe('baku')
    expect(normalizeCity('baku')).toBe('baku')
  })

  it('rejects unknown cities', () => {
    expect(normalizeCity('Gəncə')).toBeNull()
  })
})

describe('parseCoordinates', () => {
  it('parses "lat,lng" and rejects invalid values', () => {
    expect(parseCoordinates('40.3755, 49.8335')).toEqual({ lat: 40.3755, lng: 49.8335 })
    expect(parseCoordinates('40.3755')).toBeNull()
    expect(parseCoordinates('95,49')).toBeNull()
    expect(parseCoordinates(null)).toBeNull()
  })
})

describe('initialsOf', () => {
  it('takes up to two initials', () => {
    expect(initialsOf('Elvin Məmmədov')).toBe('EM')
    expect(initialsOf('Aysel Nuri Qasımova')).toBe('AN')
    expect(initialsOf('  ')).toBe('?')
  })
})

describe('parseGameListParams', () => {
  const parse = (query: string) => parseGameListParams(new URLSearchParams(query), new Date(NOW))

  it('defaults to open-or-full games from now until the end of tomorrow in Baku', () => {
    expect(parse('')).toEqual({
      ok: true,
      query: {
        sport: null,
        city: 'baku',
        from: new Date(NOW),
        to: new Date('2026-09-14T20:00:00.000Z'),
        onlyOpen: false,
        page: 1,
        limit: 12,
      },
    })
  })

  it('clamps paging and never starts in the past', () => {
    const result = parse('page=0&limit=500&from=2026-01-01T00:00:00Z&status=open&sport=tennis')
    expect(result).toMatchObject({ ok: true, query: { page: 1, limit: 50, from: new Date(NOW), onlyOpen: true, sport: 'tennis' } })
  })

  it('rejects invalid input', () => {
    expect(parse('sport=curling')).toMatchObject({ ok: false, code: 'INVALID_SPORT' })
    expect(parse('city=Paris')).toMatchObject({ ok: false, code: 'UNKNOWN_CITY' })
    expect(parse('to=tomorrow')).toMatchObject({ ok: false, code: 'INVALID_DATE' })
    expect(parse('status=full')).toMatchObject({ ok: false, code: 'INVALID_STATUS' })
  })
})

describe('normalizeGameRecord / toGameCard', () => {
  const raw = {
    id: 7,
    title: 'Axşam futbolu',
    sport: 'football',
    level: 'medium',
    scheduledAt: inHours(3),
    maxPlayers: 10,
    availablePlayers: 1,
    status: 'scheduled',
    arena: { id: 3, name: 'Inter Arena', district: 'Nərimanov', location: 'Nərimanov, Bakı', city: 'baku', coordinates: '40.4,49.87', sportTypes: ['football'] },
    host: { id: 1, fullName: 'Elvin Məmmədov', email: 'elvin@example.com', profilePicture: { url: '/api/media/file/elvin.png' } },
  }

  it('returns the card fields with the venue as an object and server-side status', () => {
    expect(toGameCard(normalizeGameRecord(raw, NOW))).toEqual({
      id: '7',
      title: 'Axşam futbolu',
      sport: 'football',
      level: 'medium',
      venue: {
        id: '3',
        name: 'Inter Arena',
        district: 'Nərimanov',
        address: 'Nərimanov, Bakı',
        city: 'baku',
        coordinates: { lat: 40.4, lng: 49.87 },
        sportTypes: ['football'],
      },
      district: 'Nərimanov',
      startsAt: inHours(3),
      currentCount: 9,
      maxCount: 10,
      remainingSpots: 1,
      status: 'open',
      coverImageUrl: '/images/game-football-1-7880cc.png',
      coverImage: {
        thumbnailUrl: '/images/game-football-1-7880cc.png',
        fullUrl: '/images/game-football-1-7880cc.png',
        fallbackUrl: '/images/game-football-1-7880cc.png',
      },
      host: { name: 'Elvin Məmmədov', avatarUrl: '/api/media/file/elvin.png' },
    })
  })

  it('never exposes the host email as their name', () => {
    const game = normalizeGameRecord({ ...raw, host: { id: 1, email: 'elvin@example.com' } }, NOW)
    expect(game.host.name).toBe('OyunaGəl istifadəçisi')
  })

  it('prefers uploaded cover sizes and prefixes them with MEDIA_BASE_URL', () => {
    vi.stubEnv('MEDIA_BASE_URL', 'https://cdn.example.com/')
    const game = normalizeGameRecord({
      ...raw,
      sport: 'tennis',
      coverImage: {
        url: '/api/media/file/court.jpg',
        sizes: {
          thumbnail: { url: '/api/media/file/court-480x270.webp' },
          full: { url: '/api/media/file/court-1600x900.webp' },
        },
      },
    }, NOW)
    expect(game.cover).toEqual({
      thumbnailUrl: 'https://cdn.example.com/api/media/file/court-480x270.webp',
      fullUrl: 'https://cdn.example.com/api/media/file/court-1600x900.webp',
      fallbackUrl: '/images/game-tennis-1-3ee73d.png',
    })
  })
})
