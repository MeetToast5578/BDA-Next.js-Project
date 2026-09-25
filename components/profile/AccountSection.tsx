import type { ReactNode } from 'react'

import detail from '@/components/games/GameDetail.module.css'
import section from '@/components/games/GamesSection.module.css'
import { LogoutButton } from '@/components/site/LogoutButton'
import { buttonClass } from '@/components/ui/button'
import styles from './Profile.module.css'

/**
 * "Hesab" at the bottom of "Profilim": who is signed in and "Çıxış" — on phones the header keeps
 * these in its menu, so the page has them too — then anything destructive underneath.
 */
export function AccountSection({ email, children }: { email: string; children?: ReactNode }) {
  return (
    <section className={`${styles.account} fade`} aria-labelledby="account-title">
      <h2 id="account-title" className={section.title}>
        Hesab
      </h2>
      <div className={`${detail.panel} ${styles.accountPanel}`}>
        <p className={styles.accountText}>
          <strong>{email}</strong> hesabı ilə daxil olmusunuz.
        </p>
        <LogoutButton className={buttonClass('outlineDark', 'md')} />
      </div>
      {children}
    </section>
  )
}
