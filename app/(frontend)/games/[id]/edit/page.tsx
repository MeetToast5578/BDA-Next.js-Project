import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { BackLink } from '@/components/games/BackLink'
import { GameForm } from '@/components/create/GameForm'
import styles from '@/components/create/GameForm.module.css'
import { GameFormSkeleton } from '@/components/games/skeletons'
import { formatBakuDateKey } from '@/lib/game-backend'
import { getGameDetail } from '@/lib/game-queries'
import { loginHref } from '@/lib/safe-redirect'
import { getCurrentUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Oyunu redaktə et' }

type Props = { params: Promise<{ id: string }> }

function parseGameId(raw: string) {
  const gameId = Number(raw)
  return Number.isSafeInteger(gameId) && gameId > 0 ? gameId : null
}

/** "Oyunu redaktə et". The heading shows at once; only the host gets the form, everyone else is sent back. */
export default function EditGamePage({ params }: Props) {
  return (
    <div className={`container-wide ${styles.page}`}>
      {/* The link needs the game id from the URL; its text stands in for the split second before. */}
      <Suspense
        fallback={
          <span className={styles.back} aria-hidden="true">
            ← Oyuna qayıt
          </span>
        }
      >
        <EditBackLink params={params} />
      </Suspense>
      <div className={styles.intro}>
        <h1 className={styles.title}>Oyunu redaktə et</h1>
        <p className={styles.subtitle}>Oyun məlumatlarını dəyişin və ya oyunu silin.</p>
      </div>
      <Suspense fallback={<GameFormSkeleton />}>
        <EditGameForm params={params} />
      </Suspense>
    </div>
  )
}

async function EditBackLink({ params }: Props) {
  const gameId = parseGameId((await params).id)
  return (
    <BackLink fallback={gameId ? `/games/${gameId}` : '/'} className={styles.back}>
      Oyuna qayıt
    </BackLink>
  )
}

async function EditGameForm({ params }: Props) {
  const gameId = parseGameId((await params).id)
  if (!gameId) notFound()

  // The game is read alongside the session lookup rather than after it.
  const userPromise = getCurrentUser()
  const [user, game] = await Promise.all([
    userPromise,
    getGameDetail(gameId, userPromise.then((user) => user?.id ?? null)),
  ])
  // proxy.ts already sends visitors without a session cookie to /login; this catches an expired one.
  if (!user) redirect(loginHref(`/games/${gameId}/edit`))
  if (!game) notFound()
  // The game is public, so a non-host just goes back to reading it rather than getting a 404.
  if (!game.viewer.isHost) redirect(`/games/${gameId}`)

  return <GameForm user={user} today={formatBakuDateKey(new Date())} game={game} />
}
