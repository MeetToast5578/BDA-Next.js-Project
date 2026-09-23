import type { Metadata } from 'next'

import { GamesSection } from '@/components/games/GamesSection'
import { SPORT_LABELS } from '@/components/games/sports'
import { startOfBakuDay } from '@/lib/game-backend'
import { loadGameList, sportFromSearchParams } from '@/lib/page-data'

const PAGE_SIZE = 12
/** "Bütün oyunlar" lists everything scheduled in the coming year, not just today and tomorrow. */
const WINDOW_DAYS = 366

/**
 * The whole page is the filtered list, and the filter arrives in `?sport=`, so there is little left
 * to prerender once it is removed. The underlying reads are still cached, so this blocks on cache
 * hits rather than database round trips. Splitting the tabs out into a static shell with the grid
 * behind Suspense is the next step if this page ever needs to feel instant.
 */
export const instant = false

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sport = sportFromSearchParams(await searchParams)
  return { title: sport ? `${SPORT_LABELS[sport]} oyunları` : 'Bütün oyunlar' }
}

export default async function AllGamesPage({ searchParams }: Props) {
  const sport = sportFromSearchParams(await searchParams)
  const to = startOfBakuDay(new Date(), WINDOW_DAYS).toISOString()
  const { list, sports } = await loadGameList({ sport, limit: PAGE_SIZE, to })

  return (
    <GamesSection
      title="Bütün açıq oyunlar"
      titleLevel="h1"
      sports={sports}
      sport={sport}
      basePath="/games"
      list={list}
      to={to}
    />
  )
}
