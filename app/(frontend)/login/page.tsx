import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthShell } from '@/components/auth/AuthShell'
// Email/password sign-in is disabled: only Google sign-in is allowed.
// import { LoginForm } from '@/components/auth/LoginForm'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { getCurrentUser, isGoogleAuthConfigured } from '@/lib/session'

export const metadata: Metadata = { title: 'Daxil ol' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const next = safeRedirectPath((await searchParams).next)
  if (await getCurrentUser()) redirect(next)

  return (
    <AuthShell
      eyebrow="Xoş gəldin"
      title="Daxil ol"
      description="Oyunlara qoşulmaq və öz oyununu yaratmaq üçün hesabına daxil ol."
      googleHref={isGoogleAuthConfigured() ? `/api/auth/google?next=${encodeURIComponent(next)}` : undefined}
    >
      {/* <LoginForm next={next} /> */}
    </AuthShell>
  )
}
