/**
 * The origin the visitor is on, e.g. http://localhost:3000 or https://bda-next-six.vercel.app.
 * Read from the forwarding headers because on Vercel `request.url` reports the internal
 * http://localhost:3000 instead of the public domain.
 */
export function requestOrigin(request: Request) {
  const url = new URL(request.url)
  const host = firstValue(request.headers.get('x-forwarded-host')) ?? request.headers.get('host') ?? url.host
  const proto = firstValue(request.headers.get('x-forwarded-proto')) ?? url.protocol.slice(0, -1)
  return `${proto === 'https' ? 'https' : 'http'}://${host}`
}

/**
 * Where Google sends the user back after sign-in: this route on the host they started from
 * (http://localhost:3000 locally, the Vercel domain in production). Each origin must be listed
 * under "Authorized redirect URIs" in the Google Cloud OAuth client.
 */
export function googleCallbackUrl(request: Request) {
  return new URL('/api/auth/google/callback', requestOrigin(request)).toString()
}

/** Proxies may join several values with commas; the first is the one the client used. */
function firstValue(header: string | null) {
  return header?.split(',')[0].trim() || undefined
}
