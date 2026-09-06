'use client'

import './styles.css'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const sports = [
  { name: 'Futbol', value: 'football', icon: '⚽' },
  { name: 'Tennis', value: 'tennis', icon: '🎾' },
  { name: 'Basketbol', value: 'basketball', icon: '🏀' },
]

type Game = {
  id: string
  title: string
  sport: string
  date: string
  time: string
  image: string
  level: string
  icon: string
  arena: string
  host: string
  maxPlayers: number
  availablePlayers: number
  scheduledAt: string
  status: string
}

const sportDetails: Record<string, { name: string; icon: string; image: string }> = {
  football: { name: 'Futbol', icon: '⚽', image: '/images/game-football-1-7880cc.png' },
  basketball: { name: 'Basketbol', icon: '🏀', image: '/images/game-basketball-1-4a0ddf.png' },
  tennis: { name: 'Tennis', icon: '🎾', image: '/images/game-tennis-1-3ee73d.png' },
}

const levelNames: Record<string, string> = { beginner: 'Başlanğıc', medium: 'Orta səviyyə', high: 'Yüksək' }

function normalizeGame(item: Record<string, unknown>): Game {
  const sport = sportDetails[String(item.sport)] || sportDetails.football
  const arena = typeof item.arena === 'object' && item.arena ? item.arena as { name?: string; location?: string } : {}
  const host = typeof item.host === 'object' && item.host ? item.host as { email?: string; ['Full Name']?: string } : {}
  const date = new Date(String(item.scheduledAt))

  const dateLabel = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getFullYear()).slice(-2)}`

  return {
    id: String(item.id), title: String(item.title), sport: sport.name,
    date: dateLabel,
    time: date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
    image: typeof item.image === 'string' && item.image ? item.image : sport.image,
    level: levelNames[String(item.level)] || 'Orta səviyyə', icon: sport.icon,
    arena: [arena.name, arena.location].filter(Boolean).join(', ') || 'Inter Arena, Nərimanov, Bakı',
    host: host['Full Name'] || host.email || 'OyunaGəl istifadəçisi',
    maxPlayers: Number(item.maxPlayers) || 12, availablePlayers: Number(item.availablePlayers) || 0,
    scheduledAt: String(item.scheduledAt), status: String(item.status || 'scheduled'),
  }
}

function AvatarStack() {
  return (
    <div className="avatar-stack" aria-label="Oyundakı iştirakçılar">
      <Image src="/images/hero-avatar-1.png" alt="" width={34} height={34} />
      <Image src="/images/hero-avatar-2.png" alt="" width={34} height={34} />
      <Image src="/images/hero-avatar-3.png" alt="" width={34} height={34} />
      <span>+8</span>
    </div>
  )
}

function HeroGameCard({ game, muted = false }: { game: Game; muted?: boolean }) {
  return (
    <article className={`hero-game-card${muted ? ' muted' : ''}`}>
      <div className="game-card-topline"><span>● &nbsp;Açıq oyun</span><b>{game.icon} {game.sport}</b></div>
      <h3>{game.title}</h3>
      <p>{game.arena} · {game.level}</p>
      <div className="hero-attendance"><strong>{game.maxPlayers - game.availablePlayers}</strong><span>/ {game.maxPlayers} iştirakçı</span></div>
      <div className="hero-progress"><i /></div>
      <div className="hero-card-bottom"><AvatarStack /><button>Qoşul</button></div>
    </article>
  )
}

function GameCard({ game }: { game: Game }) {
  return (
    <article className="game-card">
      <div className="game-image-wrap">
        <Image src={game.image} alt={`${game.sport} oyunu`} fill sizes="(max-width: 720px) 100vw, 33vw" />
        <span className={`level level-${game.level === 'Başlanğıc' ? 'beginner' : game.level === 'Yüksək' ? 'high' : 'middle'}`}>{game.level}</span>
        <span className="sport-badge">{game.icon} {game.sport}</span>
      </div>
      <div className="game-card-body">
        <h3>{game.sport} · {game.date}</h3>
        <p className="game-meta"><Image src="/images/icon-pin.svg" alt="" width={14} height={14} /> {game.arena}</p>
        <p className="game-meta"><Image src="/images/icon-calendar.svg" alt="" width={14} height={14} /> {game.date} <Image src="/images/icon-clock.svg" alt="" width={14} height={14} /> {game.time}</p>
        <div className="spots"><span>{game.maxPlayers - game.availablePlayers}/{game.maxPlayers} oyunçu</span><b>{game.availablePlayers} yer qalıb</b></div>
        <div className="spots-progress"><i /></div>
        <div className="game-card-footer"><span><Image src="/images/avatar-elvin.png" alt="" width={32} height={32} /> {game.host}</span><button>Qoşul</button></div>
      </div>
    </article>
  )
}

export default function HomePage() {
  const [activeSport, setActiveSport] = useState('all')
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(3)

  useEffect(() => {
    fetch('/api/games?limit=100&sort=scheduledAt&depth=2&where[status][equals]=scheduled')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Games request failed')))
      .then((data: { docs?: Record<string, unknown>[] }) => setGames((data.docs || []).map(normalizeGame)))
      .catch(() => setGames([]))
      .finally(() => setIsLoading(false))
  }, [])

  const today = new Date()
  const isToday = (game: Game) => {
    const date = new Date(game.scheduledAt)
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  }
  const openTodayGames = games.filter((game) => game.status === 'scheduled' && game.availablePlayers > 0 && isToday(game))
  const filteredGames = openTodayGames.filter((game) => activeSport === 'all' || game.sport === activeSport)
  const visibleGames = filteredGames.slice(0, visibleCount)
  const heroGame = openTodayGames.length ? openTodayGames[carouselIndex % openTodayGames.length] : undefined
  const previousHeroIndex = openTodayGames.length ? (carouselIndex - 1 + openTodayGames.length) % openTodayGames.length : 0
  const nextHeroIndex = openTodayGames.length ? (carouselIndex + 1) % openTodayGames.length : 0

  function changeCarousel(direction: number) {
    if (openTodayGames.length > 0) setCarouselIndex((current) => (current + direction + openTodayGames.length) % openTodayGames.length)
  }

  return (
    <div className="landing-page">
      <header className="site-header"><a className="brand" href="#top">OyunaGəl</a><nav><a href="#games">Daxil ol</a><a className="nav-cta" href="/create-game">Oyun yarat</a></nav></header>
      <main>
        <section className="hero" id="top">
          <div className="hero-grid" />
          <div className="hero-copy"><h1>Sevdiyin idmanı seç, meydança <em>tap</em>, oyuna qoşul</h1><p>Bakı daxilində yüzlərlə aktiv oyun və meydança. Komanda yoldaşlarını tap və professional atmosferdə idman et.</p><div className="hero-actions"><a className="primary-button" href="#games">Açıq oyunlara bax</a><a className="secondary-button" href="/create-game">Oyun yarat</a></div></div>
          <div className="hero-carousel">{openTodayGames.length === 0 ? <p className="hero-empty">Bu gün üçün açıq oyun yoxdur.</p> : openTodayGames.length === 1 ? <HeroGameCard game={heroGame!} /> : <><HeroGameCard game={openTodayGames[previousHeroIndex]!} muted /><HeroGameCard game={heroGame!} />{openTodayGames.length > 2 && <HeroGameCard game={openTodayGames[nextHeroIndex]!} muted />}</>}</div>
          <div className="carousel-controls"><button aria-label="Əvvəlki oyun" onClick={() => changeCarousel(-1)} disabled={openTodayGames.length < 2}>‹</button><div>{openTodayGames.map((game, index) => <i className={index === carouselIndex ? 'active' : ''} key={game.id} />)}</div><button aria-label="Növbəti oyun" onClick={() => changeCarousel(1)} disabled={openTodayGames.length < 2}>›</button></div>
        </section>
        <section className="games-section" id="games">
          <div className="sport-tabs">{sports.map((sport) => <button key={sport.name} className={activeSport === sport.name || (activeSport === 'all' && sport.name === 'Futbol') ? 'selected' : ''} onClick={() => { setActiveSport(activeSport === sport.name ? 'all' : sport.name); setVisibleCount(3) }}><strong>{sport.icon}</strong><b>{sport.name}</b><span>{openTodayGames.filter((game) => game.sport === sport.name).length} açıq oyun</span></button>)}</div>
          <div className="section-heading"><span>AÇIQ OYUNLAR</span><h2>Bu gün üçün qoşula biləcəyin oyunlar</h2><p>Aktiv filtr: {activeSport === 'all' ? 'Bütün idman növləri' : activeSport} · Bakı</p></div>
          {isLoading && <p className="games-status">Oyunlar yüklənir...</p>}
          {!isLoading && filteredGames.length === 0 && <p className="games-status">Hələ bu kateqoriyada açıq oyun yoxdur.</p>}
          <div className="game-grid">{visibleGames.map((game) => <GameCard game={game} key={game.id} />)}</div>
          {filteredGames.length > 3 && <div className="game-list-controls"><button className="more-button" onClick={() => setVisibleCount((count) => Math.min(count + 3, filteredGames.length))}>Daha çox</button>{visibleCount > 3 && <button className="less-button" onClick={() => setVisibleCount(3)}>Az göstər</button>}</div>}
        </section>
      </main>
      <footer className="site-footer"><div><b>OyunaGəl</b><p>Azərbaycanın ən böyük idman koordinasiya<br />platforması. Birlikdə oynayaq.</p></div><nav><a href="#top">Haqqımızda</a><a href="#top">Qaydalar</a><a href="#top">Məxfilik</a><a href="#top">Əlaqə</a></nav><small>© 2024 OyunaGəl. Bütün hüquqlar qorunur.</small></footer>
    </div>
  )
}
