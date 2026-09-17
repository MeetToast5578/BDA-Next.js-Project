'use client'

import Image from 'next/image'
import { useState } from 'react'

import { apiFetch, withQuery } from '@/lib/api-client'
import type { GameListResponse } from '@/lib/api-types'
import { buttonClass } from '@/components/ui/button'
import { GameCard } from './GameCard'
import styles from './GamesGrid.module.css'

/**
 * Game cards with "Daha çox": each click appends the next page of `GET /api/v1/games` with the same
 * filters. Remount it (via `key`) when the filters change.
 */
export function GamesGrid({
  initial,
  sport,
  to,
  empty,
  cardHeadingLevel,
}: {
  initial: GameListResponse
  sport: string | null
  /** Upper bound of the list window, passed through so every page uses the same one. */
  to?: string
  empty: React.ReactNode
  cardHeadingLevel?: 'h2' | 'h3'
}) {
  const [games, setGames] = useState(initial.games)
  const [pagination, setPagination] = useState(initial.pagination)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedMore, setLoadedMore] = useState(false)

  async function loadMore() {
    setLoading(true)
    setError(null)
    try {
      const next = await apiFetch<GameListResponse>(
        withQuery('/api/v1/games', { page: pagination.page + 1, limit: pagination.limit, sport, to }),
      )
      setGames((current) => {
        // A game can shift pages if one before it started in the meantime.
        const seen = new Set(current.map((game) => game.id))
        return [...current, ...next.games.filter((game) => !seen.has(game.id))]
      })
      setPagination(next.pagination)
      setLoadedMore(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oyunları yükləmək mümkün olmadı.')
    } finally {
      setLoading(false)
    }
  }

  if (games.length === 0) return <>{empty}</>

  return (
    <div className={styles.wrapper}>
      <ul className={styles.grid}>
        {games.map((game, index) => (
          <li key={game.id}>
            <GameCard game={game} priority={index < 3} headingLevel={cardHeadingLevel} />
          </li>
        ))}
      </ul>

      {pagination.hasNextPage && (
        <button
          type="button"
          className={buttonClass('outlinePrimary', 'lg', { className: styles.more })}
          onClick={loadMore}
          disabled={loading}
          aria-busy={loading}
        >
          {loading && <span className={styles.spinner} aria-hidden="true" />}
          {loading ? 'Yüklənir…' : 'Daha çox'}
        </button>
      )}

      <p role="status" aria-live="polite" className={error ? styles.error : styles.done}>
        {error ?? (loadedMore && !pagination.hasNextPage ? 'Bütün oyunlar göstərilib' : '')}
      </p>
    </div>
  )
}

export function EmptyState({
  title,
  text,
  action,
  headingLevel = 'h3',
}: {
  title: string
  text: string
  action?: React.ReactNode
  headingLevel?: 'h1' | 'h2' | 'h3'
}) {
  const Heading = headingLevel
  return (
    <div className={styles.empty}>
      <Image src="/images/empty-sports.png" alt="" width={320} height={320} className={styles.emptyImage} />
      <Heading className={styles.emptyTitle}>{title}</Heading>
      <p className={styles.emptyText}>{text}</p>
      {action}
    </div>
  )
}
