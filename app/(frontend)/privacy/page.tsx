import type { Metadata } from 'next'

import { InfoPage } from '@/components/site/InfoPage'

export const metadata: Metadata = { title: 'Məxfilik' }

export default function PrivacyPage() {
  return (
    <InfoPage title="Məxfilik" lead="Məlumatlarından necə istifadə etdiyimiz haqqında qısa məlumat.">
      <ul>
        <li>Hesabındakı email və telefon nömrəsini yalnız sən və platforma administratorları görə bilər.</li>
        <li>Oyunlarda adın və profil şəklin digər oyunçulara görünür.</li>
        <li>
          Host kimi qeyd etdiyin telefon nömrəsi yalnız oyununa qoşulan oyunçulara göstərilir; qoşulmayanlar onu görə
          bilməz.
        </li>
        <li>Google ilə daxil olduqda yalnız adın, email ünvanın və Google hesab identifikatorun saxlanılır.</li>
      </ul>
    </InfoPage>
  )
}
