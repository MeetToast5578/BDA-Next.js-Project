/**
 * Where Google sends the user back after sign-in: this route on the host they started from
 * (http://localhost:3000 locally, the Vercel domain in production). Each origin must be listed
 * under "Authorized redirect URIs" in the Google Cloud OAuth client.
 */
export function googleCallbackUrl(request: Request) {
  return new URL('/api/auth/google/callback', request.url).toString()
}
