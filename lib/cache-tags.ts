import { revalidateTag } from 'next/cache'

/** Tag on every cached read of games, venues and participants. */
export const GAMES_CACHE_TAG = 'games'

/**
 * Expires cached game data immediately, so the next request reads fresh counts.
 * No-op outside a Next.js request (seed scripts, tests), where there is no cache to clear.
 */
export function invalidateGamesCache() {
  try {
    revalidateTag(GAMES_CACHE_TAG, { expire: 0 })
  } catch {
    // Not running inside Next.js.
  }
}
