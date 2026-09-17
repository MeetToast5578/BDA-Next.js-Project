import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'

import { safeRedirectPath } from '@/lib/safe-redirect'

export const GET = async (request: Request) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL

  if (!clientId || !callbackUrl) {
    return Response.json({ error: 'Google OAuth is not configured' }, { status: 500 })
  }

  const state = randomBytes(32).toString('hex')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)

  const cookieOptions = {
    httpOnly: true,
    maxAge: 600,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
  const response = NextResponse.redirect(url)
  response.cookies.set('google_oauth_state', state, cookieOptions)
  // Where to land after the callback, e.g. back on the game the user wanted to join.
  const next = safeRedirectPath(new URL(request.url).searchParams.get('next'), '')
  if (next) response.cookies.set('google_oauth_next', next, cookieOptions)
  return response
}
