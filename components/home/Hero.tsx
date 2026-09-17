import Link from 'next/link'

import type { FeaturedGame } from '@/lib/api-types'
import { buttonClass } from '@/components/ui/button'
import styles from './Hero.module.css'
import { TicketCarousel } from './TicketCarousel'

export function Hero({ featured, gamesAnchor }: { featured: FeaturedGame[]; gamesAnchor: string }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.content}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          Bakı · Açıq oyunlar
        </p>
        <h1 id="hero-title" className={styles.title}>
          Sevdiyin idmanı seç, meydança <em className={styles.highlight}>tap</em>, oyuna qoşul
        </h1>
        <p className={styles.lead}>
          Bakı daxilində yüzlərlə aktiv oyun və meydança. Komanda yoldaşlarını tap və professional atmosferdə idman et.
        </p>
        <div className={styles.actions}>
          <a href={`#${gamesAnchor}`} className={buttonClass('accent', 'lg')}>
            Açıq oyunlara bax
          </a>
          <Link href="/games/new" className={buttonClass('outlineLight', 'lg')}>
            Oyun yarat
          </Link>
        </div>
      </div>

      {featured.length > 0 && <TicketCarousel games={featured} />}
    </section>
  )
}
