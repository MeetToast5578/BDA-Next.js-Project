import Link from 'next/link'

import type { GameCard as GameCardData } from '@/lib/api-types'
import { buttonClass } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'
import { Avatar, LevelBadge, ProgressBar, SportBadge } from './bits'
import { CoverImage } from './CoverImage'
import styles from './GameCard.module.css'
import { STATUS_LABELS } from './sports'

export function GameCard({
  game,
  priority = false,
  headingLevel = 'h3',
}: {
  game: GameCardData
  priority?: boolean
  /** One level below the heading of the list the card is in. */
  headingLevel?: 'h2' | 'h3'
}) {
  const Heading = headingLevel
  const href = `/games/${game.id}`
  const location = [game.venue.name, game.venue.district].filter(Boolean).join(', ')

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <CoverImage
          src={game.coverImage.thumbnailUrl}
          fallbackSrc={game.coverImage.fallbackUrl}
          alt=""
          sizes="(max-width: 859px) 100vw, (max-width: 1023px) 50vw, 339px"
          priority={priority}
        />
        <div className={styles.badges}>
          <LevelBadge level={game.level} label={game.levelLabel} />
          <SportBadge sport={game.sport} label={game.sportLabel} />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <Heading className={styles.title}>
            <Link href={href} className={styles.titleLink}>
              {game.title}
            </Link>
          </Heading>
          {location && (
            <p className={styles.metaRow}>
              <span className={styles.metaItem}>
                <Icon name="pin" />
                <span className="visually-hidden">Məkan:</span>
                {location}
              </span>
            </p>
          )}
        </div>

        <p className={`${styles.metaRow} ${styles.strong}`}>
          <span className={styles.metaItem}>
            <Icon name="calendar" />
            <span className="visually-hidden">Tarix:</span>
            {game.dateLabel}
          </span>
          <span className={styles.metaItem}>
            <Icon name="clock" />
            <span className="visually-hidden">Saat:</span>
            {game.timeLabel}
          </span>
        </p>

        <div className={styles.progress}>
          <p className={styles.progressLabels}>
            <span className={styles.count}>
              {game.currentCount}/{game.maxCount} oyunçu
            </span>
            {game.remainingSpots > 0 ? (
              <span className={styles.remaining}>{game.remainingSpots} yer qalıb</span>
            ) : (
              <span className={styles.remainingNone}>Yer qalmayıb</span>
            )}
          </p>
          <ProgressBar value={game.currentCount} max={game.maxCount} label="Doluluq" />
        </div>

        <div className={styles.footer}>
          <div className={styles.host}>
            <Avatar person={game.host} size={32} decorative />
            <span className={styles.hostName}>
              <span className="visually-hidden">Host: </span>
              {game.host.name}
            </span>
          </div>
          <div className={styles.action}>
            {game.status === 'open' ? (
              // Not prefetched: the title link already prefetches this game, and for a signed-out
              // visitor ?join=1 is a redirect to /login (proxy.ts) that isn't worth fetching ahead.
              <Link
                href={`${href}?join=1`}
                prefetch={false}
                className={buttonClass('primary', 'sm', { className: styles.join })}
                aria-label={`${game.title} oyununa qoşul`}
              >
                Qoşul
              </Link>
            ) : (
              <button type="button" className={buttonClass('muted', 'sm')} disabled>
                {STATUS_LABELS[game.status]}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
