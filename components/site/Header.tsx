import Link from 'next/link'
import { Suspense } from 'react'

import { getCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/games/bits'
import { buttonClass } from '@/components/ui/button'
import styles from './Header.module.css'
import { LogoutButton } from './LogoutButton'
import { NavLink } from './NavLink'

function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={className ?? styles.logo} aria-label="OyunaGəl — ana səhifə">
      <span className={styles.dot} aria-hidden="true" />
      OyunaGəl
    </Link>
  )
}

/**
 * The only part of the header that depends on the request. It streams in behind the Suspense
 * boundary below, so a session lookup never holds up the rest of the page.
 */
async function SessionActions() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <Link href="/login" className={buttonClass('outlineDark', 'md')}>
        Daxil ol
      </Link>
    )
  }

  return (
    <>
      <span className={styles.user}>
        <Avatar
          person={{ name: user.fullName, initials: user.initials, avatarUrl: user.avatarUrl }}
          size={34}
          decorative
          className={styles.avatar}
        />
        <span className={styles.userName}>{user.firstName}</span>
      </span>
      <LogoutButton className={buttonClass('outlineDark', 'md')} />
    </>
  )
}

/** Holds the slot's width while the session resolves, so the buttons beside it do not jump. */
function SessionActionsFallback() {
  return <span className={styles.sessionPlaceholder} aria-hidden="true" />
}

export function Header() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Əsas naviqasiya">
        <Logo />

        <ul className={styles.links}>
          <li>
            {/* NavLink reads the pathname, which only exists at request time; the plain link is
                prerendered into the shell and the active-state version swaps in after hydration. */}
            <Suspense
              fallback={
                <Link href="/games" className={styles.link}>
                  Açıq oyunlar
                </Link>
              }
            >
              <NavLink href="/games" className={styles.link}>
                Açıq oyunlar
              </NavLink>
            </Suspense>
          </li>
        </ul>

        <div className={styles.actions}>
          <Suspense fallback={<SessionActionsFallback />}>
            <SessionActions />
          </Suspense>
          <Link href="/games/new" className={buttonClass('primary', 'md')}>
            Oyun yarat
          </Link>
        </div>
      </nav>
    </header>
  )
}
