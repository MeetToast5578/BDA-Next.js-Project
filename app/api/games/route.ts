import { NextResponse } from 'next/server'

import { parseGameListParams } from '@/lib/game-backend'
import { findGames } from '@/lib/game-queries'

export async function GET(request: Request) {
  const now = new Date()
  const parsed = parseGameListParams(new URL(request.url).searchParams, now)
  if (!parsed.ok) {
    return NextResponse.json({ error: { code: parsed.code, message: parsed.message } }, { status: 400 })
  }

  try {
    return NextResponse.json(await findGames(parsed.query, now))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to load games.' } }, { status: 500 })
  }
}
