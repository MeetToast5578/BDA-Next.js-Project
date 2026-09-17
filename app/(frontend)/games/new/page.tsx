import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { BackLink } from '@/components/games/BackLink'
import { CreateGameForm } from '@/components/create/CreateGameForm'
import styles from '@/components/create/CreateGameForm.module.css'
import { BAKU_TIME_ZONE } from '@/lib/game-backend'
import { loginHref } from '@/lib/safe-redirect'
import { getCurrentUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Yeni oyun yarat' }

const bakuToday = new Intl.DateTimeFormat('en-CA', {
  timeZone: BAKU_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export default async function CreateGamePage() {
  const user = await getCurrentUser()
  if (!user) redirect(loginHref('/games/new'))

  return (
    <div className={`container ${styles.page}`}>
      <BackLink fallback="/" className={styles.back}>
        Geri qayıt
      </BackLink>
      <div className={styles.intro}>
        <h1 className={styles.title}>Yeni Oyun Yarat</h1>
        <p className={styles.subtitle}>İstədiyiniz idman növünü seçin və oyun təşkil edin.</p>
      </div>
      <CreateGameForm user={user} today={bakuToday.format(new Date())} />
    </div>
  )
}
