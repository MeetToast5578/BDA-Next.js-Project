import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthShell } from '@/components/auth/AuthShell'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { getCurrentUser, isGoogleAuthConfigured } from '@/lib/session'

export const metadata: Metadata = { title: 'Daxil ol' }

/** Google is the only way in: there is no email/password form and no separate sign-up. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const next = safeRedirectPath((await searchParams).next)
  if (await getCurrentUser()) redirect(next)

  return (
    <AuthShell
      eyebrow="Xoş gəlmisiniz"
      title="Hesabınıza daxil olun"
      description="Ad, soyad və nömrə istənilmir — Google hesabınızla bir kliklə davam edin."
      googleHref={isGoogleAuthConfigured() ? `/api/auth/google?next=${encodeURIComponent(next)}` : undefined}
      unavailableNote="Google ilə giriş hazırda əlçatan deyil. Zəhmət olmasa bir az sonra yenidən cəhd edin."
    />
  )
}
