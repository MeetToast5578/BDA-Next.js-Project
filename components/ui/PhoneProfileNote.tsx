import Link from 'next/link'

import type { PhoneSource } from '@/lib/profile-form'
import form from './form.module.css'

/**
 * The line under a create or join form's phone field saying how it relates to the profile: that it
 * came from there, that it will be kept there, or — for a different number — a choice to keep it.
 */
export function PhoneProfileNote({
  id,
  source,
  save,
  onSaveChange,
}: {
  id: string
  source: PhoneSource
  save: boolean
  onSaveChange: (save: boolean) => void
}) {
  if (source === 'profile') {
    return (
      <p id={id} className={form.hint}>
        Profilinizdəki nömrə ·{' '}
        <Link href="/profile" className={form.hintLink}>
          Profildə dəyiş
        </Link>
      </p>
    )
  }
  if (source === 'will-save') {
    return (
      <p id={id} className={form.hint}>
        Bu nömrə profilinizə əlavə olunacaq, növbəti dəfə avtomatik doldurulacaq.
      </p>
    )
  }
  if (source === 'differs') {
    return (
      <label id={id} className={form.check}>
        <input type="checkbox" checked={save} onChange={(event) => onSaveChange(event.target.checked)} />
        Bu nömrəni profilimdə saxla
      </label>
    )
  }
  return null
}
