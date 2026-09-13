import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'

export const GET = async () => {
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

  const response = NextResponse.redirect(url)
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}