'use client'

import { useRef, useState } from 'react'

import { apiFetch, withQuery } from '@/lib/api-client'
import type { GameListResponse } from '@/lib/api-types'
import { buttonClass } from '@/components/ui/button'
import { GameCard } from './GameCard'
import styles from './GamesGrid.module.css'
import { gridViewState } from './grid-state'

/**
 * Game cards with "Daha çox" / "Az göstər". The list opens at the page size it was given and each
 * "Daha çox" reveals one more page, fetching from `GET /api/v1/games` only when those games aren't
 * loaded yet — so collapsing and expanding again costs no request. "Az göstər" appears once the
 * visitor has expanded and returns the list to its opening size.
 *
 * Remount it (via `key`) when the filters change. Only rendered when there is at least one game —
 * the caller shows the empty state itself, so its markup never has to cross into this client
 * component's payload.
 */
export function GamesGrid({
  initial,
  sport,
  to,
  cardHeadingLevel,
}: {
  initial: GameListResponse
  sport: string | null
  /** Upper bound of the list window, passed through so every page uses the same one. */
  to?: string
  cardHeadingLevel?: 'h2' | 'h3'
}) {
  const [games, setGames] = useState(initial.games)
  const [pagination, setPagination] = useState(initial.pagination)
  const [visible, setVisible] = useState(initial.games.length)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)

  /** The size the list opens at, and the size "Az göstər" returns it to. */
  const baseCount = initial.games.length
  const step = initial.pagination.limit

  const shown = games.slice(0, visible)
  const { canShowMore, expanded, needsFetch } = gridViewState({
    visible,
    loaded: games.length,
    baseCount,
    hasNextPage: pagination.hasNextPage,
  })

  async function showMore() {
    // Already fetched — the visitor collapsed and is expanding again, so just reveal them.
    if (!needsFetch) {
      setVisible(Math.min(visible + step, games.length))
      return
    }

    setLoading(true)
    setError(null)
    try {
      const next = await apiFetch<GameListResponse>(
        withQuery('/api/v1/games', { page: pagination.page + 1, limit: pagination.limit, sport, to }),
      )
      // A game can shift pages if one before it started in the meantime.
      const seen = new Set(games.map((game) => game.id))
      const merged = [...games, ...next.games.filter((game) => !seen.has(game.id))]
      setGames(merged)
      setVisible(merged.length)
      setPagination(next.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oyunları yükləmək mümkün olmadı.')
    } finally {
      setLoading(false)
    }
  }

  function showLess() {
    setVisible(baseCount)
    setError(null)
    // Removing rows shortens the page, which would otherwise leave a visitor who had scrolled down
    // stranded below the list. Only nudges when the grid has already scrolled off the top.
    if ((wrapper.current?.getBoundingClientRect().top ?? 0) < 0) {
      wrapper.current?.scrollIntoView({ block: 'start' })
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapper}>
      <ul className={styles.grid}>
        {shown.map((game, index) => (
          <li key={game.id}>
            <GameCard game={game} priority={index < 3} headingLevel={cardHeadingLevel} />
          </li>
        ))}
      </ul>

      {(canShowMore || expanded) && (
        <div className={styles.actions}>
          {canShowMore && (
            <button
              type="button"
              className={buttonClass('outlinePrimary', 'lg', { className: styles.more })}
              onClick={showMore}
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <span className={styles.spinner} aria-hidden="true" />}
              {loading ? 'Yüklənir…' : 'Daha çox'}
            </button>
          )}
          {expanded && (
            <button
              type="button"
              className={buttonClass('outlinePrimary', 'lg', { className: styles.more })}
              onClick={showLess}
              disabled={loading}
            >
              Az göstər
            </button>
          )}
        </div>
      )}

      <p role="status" aria-live="polite" className={error ? styles.error : styles.done}>
        {error ?? (expanded && !canShowMore ? 'Bütün oyunlar göstərilib' : '')}
      </p>
    </div>
  )
}
