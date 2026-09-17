import type { Metadata } from 'next'

import { GamesSection } from '@/components/games/GamesSection'
import { SPORT_LABELS } from '@/components/games/sports'
import { startOfBakuDay } from '@/lib/game-backend'
import { loadGameList, sportFromSearchParams } from '@/lib/page-data'

const PAGE_SIZE = 12
/** "Bütün oyunlar" lists everything scheduled in the coming year, not just today and tomorrow. */
const WINDOW_DAYS = 366

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
      eyebrow="Bütün oyunlar"
      title="Bakıda qoşula biləcəyin bütün oyunlar"
      titleLevel="h1"
      sports={sports}
      sport={sport}
      basePath="/games"
      list={list}
      to={to}
    />
  )
}
