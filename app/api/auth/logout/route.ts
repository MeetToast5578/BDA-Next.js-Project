import { NextResponse } from 'next/server'

/**
 * Ends the Google session. Payload's own `POST /api/users/logout` ends password sessions but doesn't
 * know about the `google_session` cookie, so the frontend calls both.
 */
export const POST = async () => {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('google_session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
