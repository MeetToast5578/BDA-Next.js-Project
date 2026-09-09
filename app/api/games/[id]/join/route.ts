import { NextResponse } from 'next/server'

import config from '@/payload.config'
import { deriveAvailability, normalizeGameRecord } from '@/lib/game-backend'

const gameJoinLocks = new Map<string, Promise<void>>()

async function withLock<T>(gameId: string, action: () => Promise<T>) {
  const previous = gameJoinLocks.get(gameId) ?? Promise.resolve()
  let release: (() => void) | undefined
  const current = new Promise<void>((resolve) => {
    release = resolve
  })

  gameJoinLocks.set(gameId, current)

  try {
    await previous
    return await action()
  } finally {
    release?.()
    if (gameJoinLocks.get(gameId) === current) {
      gameJoinLocks.delete(gameId)
    }
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { getPayload } = await import('payload')
    const payload = await getPayload({ config }) as {
      find: (options: { collection: string; where?: Record<string, unknown>; limit?: number; overrideAccess?: boolean }) => Promise<{ docs?: Array<Record<string, unknown>> }>
      update: (options: { collection: string; id: string | number; data: Record<string, unknown>; overrideAccess?: boolean }) => Promise<Record<string, unknown>>
    }

    return await withLock(id, async () => {
      const games = await payload.find({
        collection: 'games',
        where: { id: { equals: id } },
        limit: 1,
        overrideAccess: true,
      })

      const game = games.docs?.[0]
      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 })
      }

      const availability = deriveAvailability(game)
      if (availability.status === 'full' || availability.remainingSpots <= 0) {
        return NextResponse.json({
          error: {
            code: 'GAME_FULL',
            message: 'The game is full.',
          },
          status: 'full',
          remainingSpots: 0,
        }, { status: 409 })
      }

      const currentAvailable = Number(game.availablePlayers ?? 0)
      const nextAvailable = Math.max(0, currentAvailable - 1)
      const updated = await payload.update({
        collection: 'games',
        id,
        data: {
          availablePlayers: nextAvailable,
        },
        overrideAccess: true,
      })

      const normalized = normalizeGameRecord(updated)

      return NextResponse.json({
        id: normalized.id,
        status: normalized.status,
        remainingSpots: normalized.remainingSpots,
        availability: normalized.availability,
        message: 'Joined successfully',
      })
    })
  } catch {
    return NextResponse.json({ error: 'Unable to join the game right now.' }, { status: 500 })
  }
}
