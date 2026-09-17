import type { Metadata } from 'next'

import { InfoPage } from '@/components/site/InfoPage'

export const metadata: Metadata = { title: 'Qaydalar' }

export default function RulesPage() {
  return (
    <InfoPage title="Qaydalar" lead="Hər kəs üçün rahat oyun təcrübəsi üçün bir neçə sadə qayda.">
      <h2>Oyuna qoşulanda</h2>
      <ul>
        <li>Yalnız gələ biləcəyin oyunlara qoşul — hər yer başqa bir oyunçunun şansıdır.</li>
        <li>Qoşulduqdan sonra host ilə əlaqə saxla və gələcəyini təsdiq et.</li>
        <li>Oyun başlayandan sonra qoşulmaq mümkün deyil.</li>
      </ul>
      <h2>Oyun yaradanda</h2>
      <ul>
        <li>Meydança, tarix, saat və səviyyəni düzgün qeyd et.</li>
        <li>Artıq komandada olan oyunçuları “Mövcud iştirakçı sayı” xanasında göstər ki, boş yerlər düzgün hesablansın.</li>
        <li>Əlaqə nömrən qoşulan oyunçulara görünəcək — aktiv nömrə yaz.</li>
      </ul>
    </InfoPage>
  )
}
