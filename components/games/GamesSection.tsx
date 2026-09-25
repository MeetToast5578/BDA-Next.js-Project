import Link from 'next/link'

import type { GameListResponse, SportSummary } from '@/lib/api-types'
import { buttonClass } from '@/components/ui/button'
import { EmptyState } from './EmptyState'
import { GamesGrid } from './GamesGrid'
import styles from './GamesSection.module.css'
import { SPORT_LABELS } from './sports'
import { SportTabs } from './SportTabs'

/** "← Ana səhifəyə qayıt" above the "Bütün oyunlar" title (and in its loading placeholder). */
export function BackHomeLink() {
  return (
    <Link href="/" className={styles.back}>
      <span aria-hidden="true">←</span> Ana səhifəyə qayıt
    </Link>
  )
}

/**
 * Sport tabs, filter summary and the game grid; shared by the homepage and "Bütün oyunlar".
 * With `titleLevel="h1"` it is a page of its own: a "← Ana səhifəyə qayıt" link and the title come
 * before the tabs.
 */
export function GamesSection({
  id,
  eyebrow,
  title,
  titleLevel = 'h2',
  sports,
  sport,
  basePath,
  list,
  to,
  seeAllHref,
}: {
  id?: string
  eyebrow?: string
  title: string
  titleLevel?: 'h1' | 'h2'
  sports: SportSummary[]
  sport: string | null
  basePath: string
  list: GameListResponse
  to?: string
  seeAllHref?: string
}) {
  const Heading = titleLevel
  const standalone = titleLevel === 'h1'
  const filterLabel = sport ? SPORT_LABELS[sport] : 'Bütün idman növləri'
  const homeLink = <BackHomeLink />

  const head = (
    <div className={styles.head}>
      <div className={styles.headText}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <Heading id={`${id ?? 'games'}-title`} className={styles.title}>
          {title}
        </Heading>
        <p className={styles.filter} aria-live="polite">
          Aktiv filtr: {filterLabel} • Bakı
        </p>
      </div>
      {seeAllHref && (
        <Link href={seeAllHref} className={styles.seeAll}>
          Hamısına bax <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  )

  return (
    <section id={id} className={`container ${styles.section}`} aria-labelledby={`${id ?? 'games'}-title`}>
      {standalone ? (
        <div className={styles.intro}>
          {homeLink}
          {head}
        </div>
      ) : (
        // Keeps headings in order: on a page whose h1 is this section's title, the tabs need no heading.
        <h2 className="visually-hidden">Nə oynamaq istəyirsən?</h2>
      )}
      <SportTabs sports={sports} active={sport} basePath={basePath} />

      <div className={styles.games}>
        {!standalone && head}

        {/* "Daha çox" only ever appends, so an empty first page stays empty: the server can pick. */}
        {list.games.length === 0 ? (
          <EmptyState
            headingLevel={standalone ? 'h2' : 'h3'}
            title="Hələ açıq oyun yoxdur"
            text={
              sport
                ? 'Bu idman növü üçün yaxınlıqda aktiv oyun tapılmadı. İlk oyunu sən yarat, digərləri sənə qoşulsun.'
                : 'Hazırda aktiv oyun tapılmadı. İlk oyunu sən yarat, digərləri sənə qoşulsun.'
            }
            action={
              <>
                <Link href={sport ? `/games/new?sport=${sport}` : '/games/new'} className={buttonClass('primary', 'md')}>
                  Oyun yarat
                </Link>
                {/* On the homepage itself a link back home would go nowhere. */}
                {standalone && homeLink}
              </>
            }
          />
        ) : (
          <GamesGrid
            key={sport ?? 'all'}
            initial={list}
            query={{ sport, to }}
            cardHeadingLevel={standalone ? 'h2' : 'h3'}
          />
        )}
      </div>
    </section>
  )
}
