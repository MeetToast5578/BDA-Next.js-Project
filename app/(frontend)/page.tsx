import { GamesSection } from '@/components/games/GamesSection'
import { Hero } from '@/components/home/Hero'
import { DEFAULT_CITY, FEATURED_LIMIT } from '@/lib/game-backend'
import { getFeaturedGames } from '@/lib/game-queries'
import { loadGameList, sportFromSearchParams } from '@/lib/page-data'

const GAMES_ANCHOR = 'oyunlar'
/** Two rows of three cards before "Daha çox". */
const HOME_PAGE_SIZE = 6

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sport = sportFromSearchParams(await searchParams)
  const [featured, { list, sports }] = await Promise.all([
    getFeaturedGames(DEFAULT_CITY, FEATURED_LIMIT),
    loadGameList({ sport, limit: HOME_PAGE_SIZE }),
  ])

  return (
    <>
      <Hero featured={featured} gamesAnchor={GAMES_ANCHOR} />
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
    </>
  )
}
