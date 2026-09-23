import { connection } from 'next/server'
import { Suspense } from 'react'

import { GamesSection } from '@/components/games/GamesSection'
import { Hero } from '@/components/home/Hero'
import { TicketCarousel } from '@/components/home/TicketCarousel'
import { DEFAULT_CITY, FEATURED_LIMIT } from '@/lib/game-backend'
import { getFeaturedGames } from '@/lib/game-queries'
import { loadGameList, sportFromSearchParams } from '@/lib/page-data'

const GAMES_ANCHOR = 'oyunlar'
/** One row of three cards; "Daha çox" reveals three more at a time. */
const HOME_PAGE_SIZE = 3

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** Featured games are ranked against the current time, so they stream in rather than prerender. */
async function FeaturedCarousel() {
  // Ranking reads the clock; `connection()` marks that as request-time work so the rest of the
  // page can still prerender without this value being baked into the shell.
  await connection()
  const featured = await getFeaturedGames(DEFAULT_CITY, FEATURED_LIMIT)
  return featured.length > 0 ? <TicketCarousel games={featured} /> : null
}

/** The grid is filtered by `?sport=`, which only exists at request time. */
async function OpenGames({ searchParams }: { searchParams: SearchParams }) {
  const sport = sportFromSearchParams(await searchParams)
  const { list, sports } = await loadGameList({ sport, limit: HOME_PAGE_SIZE })

  return (
    <GamesSection
      id={GAMES_ANCHOR}
      eyebrow="Açıq oyunlar"
      title="Bu gün və sabah üçün qoşula biləcəyin oyunlar"
      sports={sports}
      sport={sport}
      basePath="/"
      list={list}
      seeAllHref={sport ? `/games?sport=${sport}` : '/games'}
    />
  )
}

export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <Hero
        gamesAnchor={GAMES_ANCHOR}
        carousel={
          <Suspense fallback={null}>
            <FeaturedCarousel />
          </Suspense>
        }
      />
      {/* Reserves the section's height so the footer does not jump when the grid arrives. */}
      <Suspense fallback={<div id={GAMES_ANCHOR} style={{ minHeight: '60vh' }} />}>
        <OpenGames searchParams={searchParams} />
      </Suspense>
    </>
  )
}
