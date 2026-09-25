import type { ReactNode } from 'react'

import { Avatar } from '@/components/games/bits'
import detail from '@/components/games/GameDetail.module.css'
import { Icon } from '@/components/ui/Icon'
import styles from './Profile.module.css'

type Person = {
  fullName: string
  initials: string
  avatarUrl: string | null
  memberSinceLabel: string | null
}

/**
 * Photo, name and the few facts a profile shows. Shared by "Profilim", where the name is an h2 under
 * the page title and the facts include the private email and phone, and the public profile, where
 * the name is the page's h1 (as a game's title is on "Oyun Detalı").
 */
export function ProfileIdentity({
  person,
  headingLevel = 'h2',
  facts,
  actions,
}: {
  person: Person
  headingLevel?: 'h1' | 'h2'
  /** Extra list items, shown before "Qeydiyyat". */
  facts?: ReactNode
  actions?: ReactNode
}) {
  const Heading = headingLevel
  return (
    <section className={`${detail.panel} ${styles.identity}`} aria-labelledby="profile-name">
      <Avatar
        person={{ name: person.fullName, initials: person.initials, avatarUrl: person.avatarUrl }}
        size={96}
        decorative
      />
      <div className={styles.identityText}>
        <Heading id="profile-name" className={styles.name}>
          {person.fullName}
        </Heading>
        <ul className={styles.facts}>
          {facts}
          {person.memberSinceLabel && (
            <li>
              <Icon name="calendar" />
              Qeydiyyat: {person.memberSinceLabel}
            </li>
          )}
        </ul>
        {actions && <div className={styles.identityActions}>{actions}</div>}
      </div>
    </section>
  )
}
