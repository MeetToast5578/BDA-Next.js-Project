'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import '../styles.css'

const sports = [
  { name: 'Futbol', icon: '⚽', count: '18 açıq oyun' },
  { name: 'Tennis', icon: '🎾', count: '7 açıq oyun' },
  { name: 'Basketbol', icon: '🏀', count: '9 açıq oyun' },
]

const todayInputValue = new Date().toISOString().slice(0, 10)

export default function CreateGamePage() {
  const router = useRouter()
  const [selectedSport, setSelectedSport] = useState('Futbol')
  const [selectedLevel, setSelectedLevel] = useState('Orta')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(false)
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const response = await fetch('/api/create-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport: selectedSport,
        level: selectedLevel,
        hostName: formData.get('hostName'),
        hostPhone: formData.get('hostPhone'),
        arena: formData.get('arena'),
        scheduledDate: formData.get('scheduledDate'),
        scheduledTime: formData.get('scheduledTime'),
        maxPlayers: formData.get('maxPlayers'),
        availablePlayers: formData.get('availablePlayers'),
      }),
    })

    const result = await response.json()
    if (response.ok) {
      router.push('/?created=1#games')
    } else {
      setError(result.error || 'Oyun yaratmaq mümkün olmadı.')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="figma-create-page">
      <header className="figma-create-header"><Link href="/" className="figma-brand"><span />OyunaGəl</Link></header>
      <main className="figma-create-main">
        <Link href="/" className="figma-back">← Geri qayıt</Link>
        <div className="figma-create-heading"><h1>Yeni Oyun Yarat</h1><p>İstədiyiniz idman növünü seçin və oyun təşkil edin.</p></div>
        <form className="figma-create-form" onSubmit={handleSubmit}>
          <section className="figma-host-panel">
            <label>Ad Soyad (Host)<input name="hostName" defaultValue="Elvin Abbasov" required /></label>
            <label>Host telefon nömrəsi<input name="hostPhone" defaultValue="+994 50 210 34 56" required /></label>
          </section>
          <section className="figma-game-panel">
            <div className="figma-sport-picker">{sports.map((sport) => <button type="button" key={sport.name} className={selectedSport === sport.name ? 'selected' : ''} onClick={() => setSelectedSport(sport.name)}><strong>{sport.icon}</strong><b>{sport.name}</b><span>{sport.count}</span></button>)}</div>
            <label>Meydança<select name="arena" defaultValue="Aku Arena — Nizami, Bakı"><option>Aku Arena — Nizami, Bakı</option><option>Inter Arena — Nərimanov, Bakı</option><option>City Sport — Yasamal, Bakı</option></select></label>
            <small>Axtarışdan seç və ya sevimlilərindən götür</small>
            <div className="figma-field-row"><label>Tarix<input name="scheduledDate" type="date" defaultValue={todayInputValue} required /></label><label>Saat<input name="scheduledTime" type="time" defaultValue="17:00" required /></label></div>
            <div className="figma-field-row"><label>Mövcud İştirakçı Sayı<input name="availablePlayers" type="number" defaultValue="0" min="0" /></label><label>Maksimum İştirakçı Sayı<input name="maxPlayers" type="number" defaultValue="10" min="2" required /></label></div>
            <fieldset><legend>Oyun Səviyyəsi</legend><div className="figma-level-picker">{['Başlanğıc', 'Orta', 'Yüksək'].map((level) => <button type="button" key={level} className={selectedLevel === level ? 'selected' : ''} onClick={() => setSelectedLevel(level)}>{level}</button>)}</div></fieldset>
            <button className="figma-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Yaradılır...' : 'Oyunu yarat'}</button>
          </section>
          {submitted && <p className="figma-form-success" role="status">Oyun məlumatları yadda saxlanıldı.</p>}
          {error && <p className="figma-form-error" role="alert">{error}</p>}
        </form>
      </main>
      <footer className="figma-create-footer"><b>OyunaGəl</b><nav><Link href="/">Haqqımızda</Link><Link href="/">Qaydalar</Link><Link href="/">Məxfilik</Link><Link href="/">Əlaqə</Link></nav><small>© 2024 OyunaGəl. Bütün hüquqlar qorunur.</small></footer>
    </div>
  )
}