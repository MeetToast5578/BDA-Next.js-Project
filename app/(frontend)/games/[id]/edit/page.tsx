import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { BackLink } from '@/components/games/BackLink'
import { GameForm } from '@/components/create/GameForm'
import styles from '@/components/create/GameForm.module.css'
import { formatBakuDateKey } from '@/lib/game-backend'
import { getGameDetail } from '@/lib/game-queries'
import { loginHref } from '@/lib/safe-redirect'
import { getCurrentUser } from '@/lib/session'

/** Host-only form behind an auth redirect; nothing here is the same for two different visitors. */
export const instant = false

export const metadata: Metadata = { title: 'Oyunu redaktə et' }

type Props = { params: Promise<{ id: string }> }

/** "Oyunu redaktə et". Only the host gets in; everyone else is sent back to the game. */
export default async function EditGamePage({ params }: Props) {
  const { id } = await params
  const gameId = Number(id)
  if (!Number.isSafeInteger(gameId) || gameId <= 0) notFound()

  const user = await getCurrentUser()
  if (!user) redirect(loginHref(`/games/${gameId}/edit`))

  const game = await getGameDetail(gameId, user.id)
  if (!game) notFound()
  // The game is public, so a non-host just goes back to reading it rather than getting a 404.
  if (!game.viewer.isHost) redirect(`/games/${gameId}`)

  return (
    <div className={`container-wide ${styles.page}`}>
      <BackLink fallback={`/games/${gameId}`} className={styles.back}>
        Oyuna qayıt
      </BackLink>
      <div className={styles.intro}>
        <h1 className={styles.title}>Oyunu redaktə et</h1>
        <p className={styles.subtitle}>Oyun məlumatlarını dəyişin və ya oyunu silin.</p>
      </div>
      <GameForm user={user} today={formatBakuDateKey(new Date())} game={game} />
    </div>
  )
}
