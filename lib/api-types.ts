// Response shapes of the /api/v1 endpoints, derived from the functions that build them so the
// frontend can't drift from the backend. Type-only imports: nothing server-side reaches the client bundle.
import type { AvailabilityStatus, countOpenGamesBySport, normalizeVenue, toGameCard } from '@/lib/game-backend'
import type { findGames, getFeaturedGames, getGameDetail } from '@/lib/game-queries'

export type { AvailabilityStatus }
export type GameCard = ReturnType<typeof toGameCard>
export type FeaturedGame = Awaited<ReturnType<typeof getFeaturedGames>>[number]
export type GameDetail = NonNullable<Awaited<ReturnType<typeof getGameDetail>>>
export type GameListResponse = Awaited<ReturnType<typeof findGames>>
export type SportSummary = ReturnType<typeof countOpenGamesBySport>[number]
export type Venue = ReturnType<typeof normalizeVenue>
export type Participant = FeaturedGame['participants']['preview'][number]

export type JoinResponse = {
  id: string
  status: AvailabilityStatus
  remainingSpots: number
  currentCount: number
  maxCount: number
  game: GameDetail | null
}

export type CreateGameRequest = {
  sport: string
  level: string
  venueId: number
  scheduledDate: string
  scheduledTime: string
  currentCount: number
  maxCount: number
  hostPhone?: string
  title?: string
}

export type CurrentUser = {
  id: number
  fullName: string
  firstName: string
  initials: string
  email: string
  phoneNumber: string | null
}
