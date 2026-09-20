import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'

import { AvatarStack, Avatar, LevelBadge, ProgressBar, SportBadge } from '@/components/games/bits'
import { BackLink } from '@/components/games/BackLink'
import { CoverImage } from '@/components/games/CoverImage'
import styles from '@/components/games/GameDetail.module.css'
import { JoinPanel } from '@/components/games/JoinPanel'
import { buttonClass } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'
import { getGameDetail } from '@/lib/game-queries'
import { formatPhone } from '@/lib/phone'
import { loginHref } from '@/lib/safe-redirect'
import { getCurrentUser } from '@/lib/session'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Shared by generateMetadata and the page within one request. */
const loadGame = cache(async (rawId: string) => {
  const gameId = Number(rawId)
  if (!Number.isSafeInteger(gameId) || gameId <= 0) return null
  const user = await getCurrentUser()
  const game = await getGameDetail(gameId, user?.id ?? null)
  return game ? { game, user } : null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loaded = await loadGame((await params).id)
  if (!loaded) return { title: 'Oyun tapılmadı' }
  const { game } = loaded
  return {
    title: game.title,
    description: `${game.sportLabel} · ${game.venue.label} · ${game.dateLabel}, ${game.timeLabel} · ${game.currentCount}/${game.maxCount} oyunçu`,
  }
}

export default async function GameDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const loaded = await loadGame(id)
  if (!loaded) notFound()
  const { game, user } = loaded

  const canJoin = game.status === 'open' && !game.viewer.joined && !game.viewer.isHost
  const wantsToJoin = (await searchParams).join === '1'
  // "Qoşul" on a card while signed out: sign in first, then come back with the join modal open.
  if (wantsToJoin && canJoin && !user) redirect(loginHref(`/games/${game.id}?join=1`))

  const location = [game.venue.name, game.venue.district].filter(Boolean).join(', ')
  const { participants, host } = game

  return (
    <div className={`container-wide ${styles.page}`}>
      <BackLink fallback="/" className={styles.back}>
        Geri qayıt
      </BackLink>
      <p className={styles.pageTitle}>Oyun Detalı</p>

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={styles.card} aria-labelledby="game-title">
            <div className={styles.cover}>
              <CoverImage
                src={game.coverImage.fullUrl}
                fallbackSrc={game.coverImage.fallbackUrl}
                alt=""
                sizes="(max-width: 859px) 100vw, 701px"
                priority
              />
              <div className={styles.coverBadges}>
                <SportBadge sport={game.sport} label={game.sportLabel} />
                <LevelBadge level={game.level} label={game.levelLabel} />
              </div>
            </div>
            <div className={styles.summary}>
              <h1 id="game-title" className={styles.title}>
                {game.title}
              </h1>
              <ul className={styles.facts}>
                <li>
                  <Icon name="calendar" />
                  <span className="visually-hidden">Tarix:</span> {game.dateLabel}
                </li>
                <li>
                  <Icon name="clock" />
                  <span className="visually-hidden">Saat:</span> {game.timeLabel}
                </li>
                {location && (
                  <li>
                    <Icon name="pin" />
                    <span className="visually-hidden">Məkan:</span> {location}
                  </li>
                )}
              </ul>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="participants-title">
            <h2 id="participants-title" className={styles.panelLabel}>
              İştirakçılar
            </h2>
            <p className={styles.headline}>
              <span className={styles.headlineCount}>{game.currentCount}</span>
              <span className={styles.headlineOf}>/ {game.maxCount} iştirakçı</span>
            </p>
            <ProgressBar
              value={game.currentCount}
              max={game.maxCount}
              label="Doluluq"
              className={styles.progress}
            />
            <div className={styles.avatars}>
              {participants.total > 0 ? (
                <AvatarStack
                  people={participants.preview}
                  total={participants.total}
                  size={34}
                  overlap={9}
                  label="Qoşulan oyunçular"
                />
              ) : (
                <p className={styles.muted}>Hələ heç kim qoşulmayıb. İlk sən ol!</p>
              )}
            </div>
          </section>
        </div>

        <aside className={`${styles.column} ${styles.aside}`} aria-label="Host və qoşulma">
          <section className={styles.panel} aria-labelledby="host-title">
            <h2 id="host-title" className={styles.panelLabel}>
              Host
            </h2>
            <div className={styles.host}>
              <Avatar person={host} size={42} decorative />
              <p className={styles.hostName}>{host.name}</p>
            </div>
            {host.phone ? (
              <>
                <a className={styles.phone} href={`tel:${host.phone}`}>
                  <span className="visually-hidden">Hostun nömrəsi:</span>
                  {formatPhone(host.phone)}
                </a>
                <p className={styles.hostNote}>
                  {game.viewer.isHost
                    ? 'Oyunu siz yaratmısınız · Bu nömrə qoşulan oyunçulara görünür'
                    : 'Oyunu yaradıb · Oyuna gələcəyinizi təsdiq etmək üçün host ilə əlaqə saxlayın'}
                </p>
              </>
            ) : (
              <p className={styles.hostNote}>Oyunu yaradıb · Əlaqə oyuna qoşulduqdan sonra görünür</p>
            )}
          </section>

          {game.viewer.isHost && (
            <Link href={`/games/${game.id}/edit`} className={buttonClass('outlinePrimary', 'lg', { block: true })}>
              Oyunu redaktə et
            </Link>
          )}

          <JoinPanel game={game} user={user} autoOpen={wantsToJoin && canJoin} />
        </aside>
      </div>
    </div>
  )
}
