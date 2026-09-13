import { NextResponse } from 'next/server'

/** Every /api/v1 error has the shape { error: { code, message } }. */
export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}
