import Link from 'next/link'

import type { GameListResponse, SportSummary } from '@/lib/api-types'
import { buttonClass } from '@/components/ui/button'
import { EmptyState, GamesGrid } from './GamesGrid'
import styles from './GamesSection.module.css'
import { SPORT_LABELS } from './sports'
import { SportTabs } from './SportTabs'

/** Sport tabs, filter summary and the game grid; shared by the homepage and "Bütün oyunlar". */
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
  eyebrow: string
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
  const filterLabel = sport ? SPORT_LABELS[sport] : 'Bütün idman növləri'

  return (
    <section id={id} className={`container ${styles.section}`} aria-labelledby={`${id ?? 'games'}-title`}>
      {/* Keeps headings in order: on a page whose h1 is this section's title, the tabs need no heading. */}
      {titleLevel === 'h2' && <h2 className="visually-hidden">Nə oynamaq istəyirsən?</h2>}
      <SportTabs sports={sports} active={sport} basePath={basePath} />

      <div className={styles.games}>
        <div className={styles.head}>
          <div className={styles.headText}>
            <p className={styles.eyebrow}>{eyebrow}</p>
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

        <GamesGrid
          key={sport ?? 'all'}
          initial={list}
          sport={sport}
          to={to}
          cardHeadingLevel={titleLevel === 'h1' ? 'h2' : 'h3'}
          empty={
            <EmptyState
              headingLevel={titleLevel === 'h1' ? 'h2' : 'h3'}
              title="Hələ açıq oyun yoxdur"
              text={
                sport
                  ? 'Bu idman növü üçün yaxınlıqda aktiv oyun tapılmadı. İlk oyunu sən yarat, digərləri sənə qoşulsun.'
                  : 'Hazırda aktiv oyun tapılmadı. İlk oyunu sən yarat, digərləri sənə qoşulsun.'
              }
              action={
                <Link href="/games/new" className={buttonClass('primary', 'md')}>
                  Oyun yarat
                </Link>
              }
            />
          }
        />
      </div>
    </section>
  )
}
