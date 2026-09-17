'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { FeaturedGame } from '@/lib/api-types'
import { AvatarStack, ProgressBar, SportBadge } from '@/components/games/bits'
import { buttonClass } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'
import styles from './TicketCarousel.module.css'

function slidesOf(track: HTMLElement | null) {
  return Array.from(track?.children ?? []) as HTMLElement[]
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Hero "ticket" carousel: native scroll-snap (so touch swipe just works) with synced arrows and dots. */
export function TicketCarousel({ games }: { games: FeaturedGame[] }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const frame = useRef(0)
  const [active, setActive] = useState(0)

  const syncActive = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const center = track.scrollLeft + track.clientWidth / 2
    let nearest = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    slidesOf(track).forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center)
      if (distance < nearestDistance) {
        nearest = index
        nearestDistance = distance
      }
    })
    setActive(nearest)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onScroll = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(syncActive)
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame.current)
      track.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [syncActive])

  function goTo(index: number) {
    const track = trackRef.current
    const slide = slidesOf(track)[index]
    if (!track || !slide) return
    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  const last = games.length - 1

  return (
    <div className={styles.carousel} role="region" aria-roledescription="karusel" aria-labelledby="featured-title">
      <h2 id="featured-title" className="visually-hidden">
        Seçilmiş oyunlar
      </h2>
      <div className={styles.viewport}>
        <ul ref={trackRef} className={styles.track} tabIndex={0} aria-label="Oyunlar, sürüşdürün">
          {games.map((game, index) => (
            <li
              key={game.id}
              className={styles.slide}
              data-position={index < active ? 'before' : index > active ? 'after' : 'active'}
              aria-roledescription="slayd"
              aria-label={`${index + 1} / ${games.length}`}
            >
              <Ticket game={game} />
            </li>
          ))}
        </ul>
      </div>

      {games.length > 1 && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label="Əvvəlki oyun"
          >
            <Icon name="chevron" className={styles.flip} />
          </button>
          <ul className={styles.dots}>
            {games.map((game, index) => (
              <li key={game.id}>
                <button
                  type="button"
                  className={styles.dot}
                  onClick={() => goTo(index)}
                  aria-label={`${index + 1}. oyuna keç`}
                  aria-current={index === active ? 'true' : undefined}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => goTo(active + 1)}
            disabled={active === last}
            aria-label="Növbəti oyun"
          >
            <Icon name="chevron" />
          </button>
        </div>
      )}
    </div>
  )
}

function Ticket({ game }: { game: FeaturedGame }) {
  const href = `/games/${game.id}`
  const place = [game.venue.name, [game.venue.district, game.venue.cityLabel].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className={styles.ticket}>
      <div className={styles.ticketTop}>
        <span className={styles.when}>
          <span className={styles.whenDot} aria-hidden="true" />
          {game.relativeTimeLabel}
        </span>
        <SportBadge sport={game.sport} label={game.sportLabel} solid />
      </div>

      <div className={styles.ticketBody}>
        <div className={styles.info}>
          <div className={styles.meta}>
            <h3 className={styles.ticketTitle}>
              <Link href={href}>{game.title}</Link>
            </h3>
            <p className={styles.ticketSub}>{[place, game.levelLabel].filter(Boolean).join(' · ')}</p>
          </div>
          <div className={styles.attendance}>
            <p className={styles.attendanceText}>
              <span className={styles.count}>{game.currentCount}</span>
              <span className={styles.of}>/ {game.maxCount} iştirakçı</span>
            </p>
            <ProgressBar
              value={game.currentCount}
              max={game.maxCount}
              label="Doluluq"
              className={styles.progress}
            />
          </div>
        </div>

        <div className={styles.ticketFooter}>
          <AvatarStack
            people={game.participants.preview}
            total={game.participants.total}
            size={36}
            overlap={8}
            moreStyle={{ bg: '#cee9d9', color: '#082016' }}
            label="İştirakçılar"
          />
          <Link
            href={`${href}?join=1`}
            className={buttonClass('white', 'md', { className: styles.join })}
            aria-label={`${game.title} oyununa qoşul`}
          >
            Qoşul
          </Link>
        </div>
      </div>
    </article>
  )
}
