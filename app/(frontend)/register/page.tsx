import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthShell } from '@/components/auth/AuthShell'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { safeRedirectPath } from '@/lib/safe-redirect'
import { getCurrentUser, isGoogleAuthConfigured } from '@/lib/session'

export const metadata: Metadata = { title: 'Qeydiyyat' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const next = safeRedirectPath((await searchParams).next)
  if (await getCurrentUser()) redirect(next)

  return (
    <AuthShell
      title="Qeydiyyat"
      description="Hesab yarat, Bakıda oyunlara qoşul və komanda yoldaşları tap."
      googleHref={isGoogleAuthConfigured() ? `/api/auth/google?next=${encodeURIComponent(next)}` : undefined}
    >
      <RegisterForm next={next} />
    </AuthShell>
  )
}
