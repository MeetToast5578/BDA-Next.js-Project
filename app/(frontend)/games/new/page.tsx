import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { BackLink } from '@/components/games/BackLink'
import { GameForm } from '@/components/create/GameForm'
import styles from '@/components/create/GameForm.module.css'
import { formatBakuDateKey } from '@/lib/game-backend'
import { sportFromSearchParams } from '@/lib/page-data'
import { loginHref } from '@/lib/safe-redirect'
import { getCurrentUser } from '@/lib/session'

/** Signed-in-only form that redirects anonymous visitors, so there is no shell worth prerendering. */
export const instant = false

export const metadata: Metadata = { title: 'Yeni oyun yarat' }

export default async function CreateGamePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // "Oyun yarat" from a filtered, empty game list passes ?sport= to preselect it.
  const sport = sportFromSearchParams(await searchParams)
  const user = await getCurrentUser()
  if (!user) redirect(loginHref(sport ? `/games/new?sport=${sport}` : '/games/new'))

  return (
    <div className={`container-wide ${styles.page}`}>
      <BackLink fallback="/" className={styles.back}>
        Geri qayıt
      </BackLink>
      <div className={styles.intro}>
        <h1 className={styles.title}>Yeni Oyun Yarat</h1>
        <p className={styles.subtitle}>İstədiyiniz idman növünü seçin və oyun təşkil edin.</p>
      </div>
      <GameForm user={user} today={formatBakuDateKey(new Date())} initialSport={sport ?? undefined} />
    </div>
  )
}
