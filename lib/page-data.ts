import 'server-only'

import type { SportTab } from '@/lib/api-types'
import { DEFAULT_CITY, SPORTS, parseGameListParams, type ProfileWindow } from '@/lib/game-backend'
import { findGames, getOpenGamesCountBySport, getPastGamesCountBySport } from '@/lib/game-queries'

type SearchParams = Record<string, string | string[] | undefined>

/** The `?sport=` filter if it names a known sport; anything else means "all sports". */
export function sportFromSearchParams(params: SearchParams) {
  const sport = params.sport
  return typeof sport === 'string' && SPORTS.includes(sport) ? sport : null
}

/**
 * First page of a game list plus the sport tab counters, read straight from the same query
 * functions as `GET /api/v1/games` and `GET /api/v1/sports`. `when: 'past'` is "Keçmiş oyunlar":
 * games that already happened, with the tabs counting those instead of open ones.
 */
export async function loadGameList({
  sport,
  limit,
  to,
  when = 'upcoming',
}: {
  sport: string | null
  limit: number
  to?: string
  when?: ProfileWindow
}): Promise<{ list: Awaited<ReturnType<typeof findGames>>; sports: SportTab[] }> {
  const now = new Date()
  const params = new URLSearchParams({ limit: String(limit), when })
  if (sport) params.set('sport', sport)
  if (to) params.set('to', to)

  const parsed = parseGameListParams(params, now)
  if (!parsed.ok) throw new Error(`Invalid game list query: ${parsed.message}`)

  const counts =
    when === 'past'
      ? getPastGamesCountBySport(DEFAULT_CITY, now)
      : getOpenGamesCountBySport(DEFAULT_CITY).then((sports) =>
          sports.map(({ openGamesCount, ...tab }) => ({ ...tab, count: openGamesCount })),
        )
  const [list, sports] = await Promise.all([findGames(parsed.query, now), counts])
  return { list, sports }
}
