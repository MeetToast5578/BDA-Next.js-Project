import type { Metadata } from 'next'
import { Suspense } from 'react'

import { BackHomeLink, GamesSection } from '@/components/games/GamesSection'
import { GamesSectionSkeleton } from '@/components/games/skeletons'
import { SPORT_LABELS } from '@/components/games/sports'
import { startOfBakuDay } from '@/lib/game-backend'
import { loadGameList, sportFromSearchParams } from '@/lib/page-data'

const PAGE_SIZE = 12
/** "Bütün oyunlar" lists everything scheduled in the coming year, not just today and tomorrow. */
const WINDOW_DAYS = 366
const TITLE = 'Bütün açıq oyunlar'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sport = sportFromSearchParams(await searchParams)
  return { title: sport ? `${SPORT_LABELS[sport]} oyunları` : 'Bütün oyunlar' }
}

/** The list depends on `?sport=`, which only exists at request time, so it streams in. */
async function AllGames({ searchParams }: { searchParams: SearchParams }) {
  const sport = sportFromSearchParams(await searchParams)
  const to = startOfBakuDay(new Date(), WINDOW_DAYS).toISOString()
  const { list, sports } = await loadGameList({ sport, limit: PAGE_SIZE, to })

  return (
    <GamesSection title={TITLE} titleLevel="h1" sports={sports} sport={sport} basePath="/games" list={list} to={to} />
  )
}

/** The placeholder is the static shell, so a click on "Açıq oyunlar" shows the page at once. */
export default function AllGamesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<GamesSectionSkeleton title={TITLE} titleLevel="h1" cards={6} backLink={<BackHomeLink />} />}>
      <AllGames searchParams={searchParams} />
    </Suspense>
  )
}
