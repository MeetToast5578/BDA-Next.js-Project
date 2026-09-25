import Link from 'next/link'

import type { GamePage } from '@/lib/api-types'
import type { ProfileRole, ProfileWindow } from '@/lib/game-backend'
import { EmptyState } from '@/components/games/EmptyState'
import type { GameCardContext } from '@/components/games/GameCard'
import { GamesGrid } from '@/components/games/GamesGrid'
import section from '@/components/games/GamesSection.module.css'
import { buttonClass } from '@/components/ui/button'
import styles from './Profile.module.css'
import { ProfileTabs } from './ProfileTabs'

const BROWSE = { href: '/games', label: 'Açıq oyunlara bax' }
const CREATE = { href: '/games/new', label: 'Oyun yarat' }

const EMPTY: Record<ProfileRole, Record<ProfileWindow, { title: string; text: string; action: typeof BROWSE }>> = {
  joined: {
    upcoming: {
      title: 'Qarşıda oyununuz yoxdur',
      text: 'Açıq oyunlara baxın və bəyəndiyiniz oyuna qoşulun.',
      action: BROWSE,
    },
    past: {
      title: 'Hələ oyuna qoşulmamısınız',
      text: 'Açıq oyunlara baxın və bəyəndiyiniz oyuna qoşulun.',
      action: BROWSE,
    },
  },
  hosting: {
    upcoming: {
      title: 'Qarşıda təşkil etdiyiniz oyun yoxdur',
      text: 'Oyun yaradın, digər oyunçular sizə qoşulsun.',
      action: CREATE,
    },
    past: {
      title: 'Hələ oyun təşkil etməmisiniz',
      text: 'Oyun yaradın, digər oyunçular sizə qoşulsun.',
      action: CREATE,
    },
  },
}

/**
 * "Mənim oyunlarım": the tabs, then the chosen list from `GET /api/v1/me/games` in the same grid as
 * every other game list. The card action follows the tab: nobody is offered "Qoşul" for a game they
 * are already in or run.
 */
export function ProfileGames({
  role,
  when,
  list,
  upcomingCounts,
}: {
  role: ProfileRole
  when: ProfileWindow
  list: GamePage
  upcomingCounts: Record<ProfileRole, number>
}) {
  const context: GameCardContext = when === 'past' ? 'past' : role
  const empty = EMPTY[role][when]

  return (
    <section className={`${styles.games} fade`} aria-labelledby="my-games-title">
      <h2 id="my-games-title" className={section.title}>
        Mənim oyunlarım
      </h2>
      <ProfileTabs role={role} when={when} upcomingCounts={upcomingCounts} />
      <div className={styles.list}>
        {list.games.length === 0 ? (
          <EmptyState
            title={empty.title}
            text={empty.text}
            action={
              <Link href={empty.action.href} className={buttonClass('primary', 'md')}>
                {empty.action.label}
              </Link>
            }
          />
        ) : (
          <GamesGrid
            key={`${role}-${when}`}
            initial={list}
            endpoint="/api/v1/me/games"
            query={{ role, when }}
            cardHeadingLevel="h3"
            cardContext={context}
          />
        )}
      </div>
    </section>
  )
}
