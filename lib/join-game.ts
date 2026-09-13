import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { JoinOutcome } from '@/collections/JoinAttempts'

export type JoinErrorCode = 'GAME_NOT_FOUND' | 'GAME_NOT_JOINABLE' | 'GAME_FULL' | 'ALREADY_JOINED'

export type JoinResult =
  | { ok: true; remainingSpots: number; maxCount: number }
  | { ok: false; code: JoinErrorCode }

class JoinRejected extends Error {
  constructor(readonly code: JoinErrorCode) {
    super(code)
  }
}

/**
 * Claims one spot in a game for a user.
 *
 * The conditional UPDATE only decrements while a spot is left, and Postgres re-checks that
 * condition after waiting on the row lock, so two joins racing for the last spot can never both
 * succeed, however many app instances are running. The participant insert runs in the same
 * transaction, so a rejected join (including a duplicate) rolls the decrement back.
 */
export async function claimSpot(payload: Payload, gameId: number, userId: number): Promise<JoinResult> {
  const db = (payload.db as unknown as PostgresAdapter).drizzle

  try {
    return await db.transaction(async (tx) => {
      const claimed = await tx.execute<{ available_players: string; max_players: string }>(sql`
        UPDATE games
        SET available_players = available_players - 1, updated_at = now()
        WHERE id = ${gameId}
          AND status = 'scheduled'
          AND scheduled_at > now()
          AND available_players > 0
        RETURNING available_players, max_players
      `)
      const game = claimed.rows[0]
      if (!game) throw new JoinRejected(await rejectionReason(tx, gameId, userId))

      const inserted = await tx.execute(sql`
        INSERT INTO game_participants (game_id, user_id, updated_at, created_at)
        VALUES (${gameId}, ${userId}, now(), now())
        ON CONFLICT (game_id, user_id) DO NOTHING
        RETURNING id
      `)
      if (inserted.rows.length === 0) throw new JoinRejected('ALREADY_JOINED')

      return { ok: true as const, remainingSpots: Number(game.available_players), maxCount: Number(game.max_players) }
    })
  } catch (error) {
    if (error instanceof JoinRejected) return { ok: false, code: error.code }
    throw error
  }
}

type Tx = Parameters<Parameters<PostgresAdapter['drizzle']['transaction']>[0]>[0]

async function rejectionReason(tx: Tx, gameId: number, userId: number): Promise<JoinErrorCode> {
  const { rows } = await tx.execute<{ status: string; upcoming: boolean; joined: boolean }>(sql`
    SELECT g.status,
           g.scheduled_at > now() AS upcoming,
           EXISTS (SELECT 1 FROM game_participants p WHERE p.game_id = g.id AND p.user_id = ${userId}) AS joined
    FROM games g
    WHERE g.id = ${gameId}
  `)
  const game = rows[0]
  if (!game) return 'GAME_NOT_FOUND'
  if (game.joined) return 'ALREADY_JOINED'
  if (game.status !== 'scheduled' || !game.upcoming) return 'GAME_NOT_JOINABLE'
  return 'GAME_FULL'
}

/** Writes the audit-log entry for a join attempt. Never throws: a logging failure must not fail the join. */
export async function recordJoinAttempt(
  payload: Payload,
  entry: { outcome: JoinOutcome; gameId: number | null; userId: number | null; remainingSpots?: number; ip: string | null },
) {
  try {
    await payload.create({
      collection: 'join-attempts',
      overrideAccess: true,
      data: {
        outcome: entry.outcome,
        gameId: entry.gameId,
        user: entry.userId,
        remainingSpots: entry.remainingSpots,
        ip: entry.ip,
      },
    })
  } catch (error) {
    console.error('Failed to record join attempt', error)
  }
}
