import type { Metadata } from 'next'
import Link from 'next/link'

import { InfoPage } from '@/components/site/InfoPage'

export const metadata: Metadata = { title: 'Əlaqə' }

export default function ContactPage() {
  return (
    <InfoPage title="Əlaqə" lead="Oyunla bağlı suallar üçün birbaşa hostla əlaqə saxla.">
      <p>
        Host-un telefon nömrəsi oyuna qoşulduqdan sonra oyun səhifəsində görünür. <Link href="/games">Açıq oyunlara bax</Link>{' '}
        və sənə uyğun oyunu seç.
      </p>
    </InfoPage>
  )
}
