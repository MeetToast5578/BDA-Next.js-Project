'use client'

import { useRouter } from 'next/navigation'
import { createContext, use, useId, useState, useTransition, type ReactNode } from 'react'

import { ApiError, patchJson } from '@/lib/api-client'
import type { MyProfile } from '@/lib/api-types'
import { MAX_FULL_NAME_LENGTH } from '@/lib/game-backend'
import { formatLocalPhone } from '@/lib/phone'
import {
  profilePatch,
  validateProfileDraft,
  type ProfileField,
  type ProfileFormErrors,
} from '@/lib/profile-form'
import { loginHref } from '@/lib/safe-redirect'
import join from '@/components/games/JoinPanel.module.css'
import { buttonClass } from '@/components/ui/button'
import form from '@/components/ui/form.module.css'
import { Modal } from '@/components/ui/Modal'
import { PhoneInput } from '@/components/ui/PhoneInput'
import styles from './Profile.module.css'

type Saved = Pick<MyProfile, 'fullName' | 'email' | 'phoneNumber'>

/** API error codes of `PATCH /api/v1/me` that belong to one field. The server's message is shown. */
const FIELD_ERRORS: Record<string, ProfileField> = {
  INVALID_NAME: 'fullName',
  INVALID_PHONE: 'phone',
  PHONE_TAKEN: 'phone',
}

const OpenContext = createContext<((field?: ProfileField) => void) | null>(null)

/**
 * "Profili redaktə et". Wraps the identity panel so that both of its triggers — the button, and
 * "Əlavə et" beside a missing phone number, which opens on the phone field — share one modal.
 *
 * Sends only what changed to `PATCH /api/v1/me`, then refreshes the page, which re-reads the profile
 * and the header chip.
 */
export function EditProfile({ profile, children }: { profile: Saved; children: ReactNode }) {
  const router = useRouter()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [focusField, setFocusField] = useState<ProfileField>('fullName')
  const [fullName, setFullName] = useState(profile.fullName)
  const [phone, setPhone] = useState(formatLocalPhone(profile.phoneNumber ?? ''))
  const [errors, setErrors] = useState<ProfileFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const [, startRefresh] = useTransition()

  const draft = { fullName, phone }
  const changed = Object.keys(profilePatch(profile, draft)).length > 0

  function openModal(field: ProfileField = 'fullName') {
    // Always start from what is saved: a cancelled edit leaves nothing behind for next time.
    setFullName(profile.fullName)
    setPhone(formatLocalPhone(profile.phoneNumber ?? ''))
    setErrors({})
    setFormError(null)
    setStatus('')
    setFocusField(field)
    setOpen(true)
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const found = validateProfileDraft(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const formElement = event.currentTarget
      requestAnimationFrame(() => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    const patch = profilePatch(profile, draft)
    if (Object.keys(patch).length === 0) {
      setOpen(false)
      return
    }

    setPending(true)
    try {
      await patchJson('/api/v1/me', patch)
      setOpen(false)
      setStatus('Profil yeniləndi.')
      // Re-reads the page, and with it the header chip, which shows the name and photo too.
      startRefresh(() => router.refresh())
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null
      if (apiError?.code === 'UNAUTHENTICATED') {
        router.push(loginHref('/profile'))
        return
      }
      const field = apiError ? FIELD_ERRORS[apiError.code] : undefined
      if (apiError && field) setErrors({ [field]: apiError.message })
      else setFormError(apiError?.message ?? 'Profili yeniləmək mümkün olmadı.')
    } finally {
      setPending(false)
    }
  }

  const fieldId = (field: ProfileField | 'email') => `${id}-${field}`
  const errorId = (field: ProfileField) => `${fieldId(field)}-error`
  const clear = (field: ProfileField) => {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }
  const fieldError = (field: ProfileField) =>
    errors[field] ? (
      <p id={errorId(field)} className={form.fieldError}>
        {errors[field]}
      </p>
    ) : null

  return (
    <OpenContext value={openModal}>
      {children}
      <p className="visually-hidden" role="status">
        {status}
      </p>

      <Modal
        open={open}
        onClose={() => {
          if (!pending) setOpen(false)
        }}
        title="Profili redaktə et"
        subtitle="Adınız oyun kartlarında və oyunçu profilinizdə görünür."
        focusKey={focusField}
      >
        <form className={join.body} onSubmit={save} noValidate>
          <hr className={join.divider} />

          <div className={form.field}>
            <label htmlFor={fieldId('fullName')} className={form.labelSmall}>
              Ad Soyad
            </label>
            <input
              id={fieldId('fullName')}
              className={form.input}
              type="text"
              autoComplete="name"
              maxLength={MAX_FULL_NAME_LENGTH}
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value)
                clear('fullName')
              }}
              required
              aria-invalid={errors.fullName ? true : undefined}
              aria-describedby={errors.fullName ? errorId('fullName') : undefined}
              data-autofocus={focusField === 'fullName' || undefined}
            />
            {fieldError('fullName')}
          </div>

          <div className={form.field}>
            <label htmlFor={fieldId('phone')} className={form.labelSmall}>
              Telefon nömrəsi (istəyə bağlı)
            </label>
            <PhoneInput
              id={fieldId('phone')}
              value={phone}
              onChange={(value) => {
                setPhone(value)
                clear('phone')
              }}
              invalid={Boolean(errors.phone)}
              describedBy={[`${fieldId('phone')}-hint`, errors.phone ? errorId('phone') : ''].filter(Boolean).join(' ')}
              data-autofocus={focusField === 'phone' || undefined}
            />
            <p id={`${fieldId('phone')}-hint`} className={form.hint}>
              Oyun yaradanda və qoşulanda avtomatik doldurulur. Mövcud oyunlardakı nömrə dəyişmir.
            </p>
            {fieldError('phone')}
          </div>

          <div className={form.field}>
            <label htmlFor={fieldId('email')} className={form.labelSmall}>
              E-poçt
            </label>
            <input
              id={fieldId('email')}
              className={form.input}
              value={profile.email}
              readOnly
              aria-describedby={`${fieldId('email')}-hint`}
            />
            <p id={`${fieldId('email')}-hint`} className={form.hint}>
              Google hesabınıza bağlıdır, dəyişdirilə bilməz.
            </p>
          </div>

          {formError && (
            <p className={form.alert} role="alert">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className={buttonClass('primary', 'xl', { block: true })}
            disabled={pending || !changed}
            aria-busy={pending}
          >
            {pending ? 'Yadda saxlanılır…' : 'Yadda saxla'}
          </button>
        </form>
      </Modal>
    </OpenContext>
  )
}

/** Opens the edit modal. Must sit inside `EditProfile`. */
export function EditProfileButton({
  field,
  variant = 'button',
  children,
}: {
  /** The field to focus when the modal opens. */
  field?: ProfileField
  variant?: 'button' | 'inline'
  children: ReactNode
}) {
  const openModal = use(OpenContext)
  if (!openModal) throw new Error('EditProfileButton must be used inside EditProfile')
  return (
    <button
      type="button"
      className={variant === 'inline' ? styles.inlineAction : buttonClass('outlinePrimary', 'md')}
      onClick={() => openModal(field)}
      aria-haspopup="dialog"
    >
      {children}
    </button>
  )
}
