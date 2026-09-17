import Link from 'next/link'

import type { SportSummary } from '@/lib/api-types'
import { sortSports, SPORT_EMOJI } from './sports'
import styles from './SportTabs.module.css'

/**
 * "Nə oynamaq istəyirsən?" filter. Each tab is a link that sets `?sport=`, so the filtered grid is
 * server-rendered and shareable; choosing the active tab again clears the filter.
 */
export function SportTabs({
  sports,
  active,
  basePath,
  hash,
}: {
  sports: SportSummary[]
  active: string | null
  basePath: string
  hash?: string
}) {
  const suffix = hash ? `#${hash}` : ''

  return (
    <nav aria-label="İdman növü filtri">
      <ul className={styles.tabs}>
        {sortSports(sports).map((sport) => {
          const isActive = sport.sport === active
          const href = isActive ? `${basePath}${suffix}` : `${basePath}?sport=${sport.sport}${suffix}`
          return (
            <li key={sport.sport}>
              <Link
                href={href}
                scroll={false}
                replace
                className={`${styles.tab} ${isActive ? styles.active : ''}`}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className={styles.emoji} aria-hidden="true">
                  {SPORT_EMOJI[sport.iconKey] ?? '🏅'}
                </span>
                <span className={styles.label}>{sport.label}</span>
                <span className={styles.count}>{sport.openGamesCount} açıq oyun</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
