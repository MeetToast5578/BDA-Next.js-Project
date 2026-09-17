import 'server-only'

import { DEFAULT_CITY, SPORTS, parseGameListParams } from '@/lib/game-backend'
import { findGames, getOpenGamesCountBySport } from '@/lib/game-queries'

type SearchParams = Record<string, string | string[] | undefined>

/** The `?sport=` filter if it names a known sport; anything else means "all sports". */
export function sportFromSearchParams(params: SearchParams) {
  const sport = params.sport
  return typeof sport === 'string' && SPORTS.includes(sport) ? sport : null
}

/**
 * First page of a game list plus the sport tab counters, read straight from the same query
 * functions as `GET /api/v1/games` and `GET /api/v1/sports`.
 */
export async function loadGameList({ sport, limit, to }: { sport: string | null; limit: number; to?: string }) {
  const now = new Date()
  const params = new URLSearchParams({ limit: String(limit) })
  if (sport) params.set('sport', sport)
  if (to) params.set('to', to)

  const parsed = parseGameListParams(params, now)
  if (!parsed.ok) throw new Error(`Invalid game list query: ${parsed.message}`)

  const [list, sports] = await Promise.all([findGames(parsed.query, now), getOpenGamesCountBySport(DEFAULT_CITY)])
  return { list, sports }
}
