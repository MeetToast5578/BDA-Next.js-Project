import Link from 'next/link'

import { getCurrentUser } from '@/lib/session'
import { buttonClass } from '@/components/ui/button'
import styles from './Header.module.css'
import { LogoutButton } from './LogoutButton'
import { NavLink } from './NavLink'

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={className ?? styles.logo} aria-label="OyunaGəl — ana səhifə">
      <span className={styles.dot} aria-hidden="true" />
      OyunaGəl
    </Link>
  )
}

export async function Header() {
  const user = await getCurrentUser()

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Əsas naviqasiya">
        <Logo />

        <ul className={styles.links}>
          <li>
            <NavLink href="/games" className={styles.link}>
              Açıq oyunlar
            </NavLink>
          </li>
        </ul>

        <div className={styles.actions}>
          {user ? (
            <>
              <span className={styles.user}>
                <span className={styles.avatar} aria-hidden="true">
                  {user.initials}
                </span>
                <span className={styles.userName}>{user.firstName}</span>
              </span>
              <LogoutButton className={buttonClass('outlineDark', 'md')} />
            </>
          ) : (
            <Link href="/login" className={buttonClass('outlineDark', 'md')}>
              Daxil ol
            </Link>
          )}
          <Link href="/games/new" className={buttonClass('dark', 'md')}>
            Oyun yarat
          </Link>
        </div>
      </nav>
    </header>
  )
}
