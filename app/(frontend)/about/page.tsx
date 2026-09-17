import type { Metadata } from 'next'
import Link from 'next/link'

import { InfoPage } from '@/components/site/InfoPage'

export const metadata: Metadata = { title: 'Haqqımızda' }

export default function AboutPage() {
  return (
    <InfoPage title="Haqqımızda" lead="OyunaGəl — Azərbaycanın idman koordinasiya platforması. Birlikdə oynayaq.">
      <p>
        OyunaGəl Bakıda futbol, tennis və basketbol oynamaq istəyənləri bir araya gətirir. Açıq oyunlara bax, sənə uyğun
        vaxtı və meydançanı seç, bir kliklə qoşul.
      </p>
      <p>
        Komandanda oyunçu çatmır? <Link href="/games/new">Oyun yarat</Link>, boş yerlərin sayını qeyd et — digər
        oyunçular sənə qoşulsun.
      </p>
    </InfoPage>
  )
}
