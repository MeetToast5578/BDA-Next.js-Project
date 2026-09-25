'use client'

import { useRouter } from 'next/navigation'
import { createContext, use, useId, useRef, useState, useTransition, type ReactNode } from 'react'

import { apiFetch, ApiError, patchJson } from '@/lib/api-client'
import type { MyProfile, ProfileUpdateRequest } from '@/lib/api-types'
import { MAX_FULL_NAME_LENGTH } from '@/lib/game-backend'
import { formatLocalPhone } from '@/lib/phone'
import {
  profilePatch,
  validateProfileDraft,
  type ProfileField,
  type ProfileFormErrors,
} from '@/lib/profile-form'
import { loginHref } from '@/lib/safe-redirect'
import { IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/lib/uploads'
import { Avatar } from '@/components/games/bits'
import join from '@/components/games/JoinPanel.module.css'
import { buttonClass } from '@/components/ui/button'
import form from '@/components/ui/form.module.css'
import { Modal } from '@/components/ui/Modal'
import { PhoneInput } from '@/components/ui/PhoneInput'
import styles from './Profile.module.css'

type Saved = Pick<
  MyProfile,
  'fullName' | 'initials' | 'email' | 'phoneNumber' | 'avatarUrl' | 'hasUploadedPicture' | 'googleAvatarUrl'
>

/**
 * The picture as the form holds it: as saved, a new upload not saved yet, or marked for removal
 * (which falls back to the Google picture, then initials).
 */
type Picture = { kind: 'saved' } | { kind: 'uploaded'; id: number; url: string | null } | { kind: 'removed' }

const TYPE_ERROR = 'Yalnız JPG, PNG və ya WebP şəkil yükləyin.'
const SIZE_ERROR = 'Şəkil 4 MB-dan böyük ola bilməz.'

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
 * A new picture is uploaded as soon as it is chosen; "Yadda saxla" then sends only what changed to
 * `PATCH /api/v1/me` and refreshes the page, which re-reads the profile and the header chip.
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
  const [picture, setPicture] = useState<Picture>({ kind: 'saved' })
  const [uploading, setUploading] = useState(false)
  const [pictureError, setPictureError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [, startRefresh] = useTransition()

  const draft = { fullName, phone }
  const pictureChange: ProfileUpdateRequest =
    picture.kind === 'uploaded'
      ? { profilePictureId: picture.id }
      : picture.kind === 'removed'
        ? { profilePictureId: null }
        : {}
  const changed = Object.keys({ ...profilePatch(profile, draft), ...pictureChange }).length > 0
  const previewUrl =
    picture.kind === 'uploaded' ? picture.url : picture.kind === 'removed' ? profile.googleAvatarUrl : profile.avatarUrl
  const canRemove = picture.kind === 'uploaded' || (picture.kind === 'saved' && profile.hasUploadedPicture)

  function openModal(field: ProfileField = 'fullName') {
    // Always start from what is saved: a cancelled edit leaves nothing behind for next time.
    setFullName(profile.fullName)
    setPhone(formatLocalPhone(profile.phoneNumber ?? ''))
    setErrors({})
    setFormError(null)
    setStatus('')
    setPicture({ kind: 'saved' })
    setPictureError(null)
    setFocusField(field)
    setOpen(true)
  }

  /** An upload that was never saved belongs to nobody's profile, so it isn't kept. Best effort. */
  function discardUpload(current: Picture) {
    if (current.kind === 'uploaded') {
      apiFetch(`/api/media/${current.id}`, { method: 'DELETE' }).catch(() => null)
    }
  }

  function close() {
    if (pending || uploading) return
    discardUpload(picture)
    setPicture({ kind: 'saved' })
    setOpen(false)
  }

  /** Uploads the chosen file straight away (`POST /api/media`), so "Yadda saxla" only has to point at it. */
  async function pickPicture(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared, so choosing the same file again after an error still fires a change.
    event.target.value = ''
    if (!file) return
    setPictureError(null)
    // Checked here too, so a wrong file fails at once instead of after its upload.
    if (!IMAGE_MIME_TYPES.includes(file.type)) return setPictureError(TYPE_ERROR)
    if (file.size > MAX_UPLOAD_BYTES) return setPictureError(SIZE_ERROR)

    const body = new FormData()
    body.append('file', file)
    body.append('_payload', JSON.stringify({ alt: `${profile.fullName} — profil şəkli` }))
    setUploading(true)
    try {
      const { doc } = await apiFetch<{ doc: { id: number; url?: string | null } }>('/api/media', { method: 'POST', body })
      discardUpload(picture)
      setPicture({ kind: 'uploaded', id: doc.id, url: doc.url ?? null })
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      setPictureError(
        status === 413
          ? SIZE_ERROR
          : status === 400
            ? TYPE_ERROR
            : status === 401 || status === 403
              ? 'Şəkil yükləmək üçün yenidən daxil olun.'
              : err instanceof ApiError && err.code === 'NETWORK_ERROR'
                ? err.message
                : 'Şəkli yükləmək mümkün olmadı.',
      )
    } finally {
      setUploading(false)
    }
  }

  function removePicture() {
    discardUpload(picture)
    setPictureError(null)
    setPicture(profile.hasUploadedPicture ? { kind: 'removed' } : { kind: 'saved' })
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

    const patch = { ...profilePatch(profile, draft), ...pictureChange }
    if (Object.keys(patch).length === 0) {
      setOpen(false)
      return
    }

    setPending(true)
    try {
      await patchJson('/api/v1/me', patch)
      // The upload is the profile's picture now: closing must not discard it.
      setPicture({ kind: 'saved' })
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
      else if (apiError?.code === 'MEDIA_NOT_FOUND') {
        setPicture({ kind: 'saved' })
        setPictureError('Şəkil tapılmadı. Yenidən yükləyin.')
      } else setFormError(apiError?.message ?? 'Profili yeniləmək mümkün olmadı.')
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
        onClose={close}
        title="Profili redaktə et"
        subtitle="Adınız oyun kartlarında və oyunçu profilinizdə görünür."
        focusKey={focusField}
      >
        <form className={join.body} onSubmit={save} noValidate>
          <hr className={join.divider} />

          <div className={styles.pictureRow}>
            <Avatar
              person={{ name: fullName.trim() || profile.fullName, initials: profile.initials, avatarUrl: previewUrl }}
              size={72}
              decorative
            />
            <div className={styles.pictureText}>
              <div className={styles.pictureActions}>
                <button
                  type="button"
                  className={buttonClass('outlinePrimary', 'sm')}
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading || pending}
                  aria-busy={uploading}
                  aria-describedby={[`${id}-picture-hint`, pictureError ? `${id}-picture-error` : ''].filter(Boolean).join(' ')}
                >
                  {uploading ? 'Yüklənir…' : 'Şəkli dəyiş'}
                </button>
                {canRemove && (
                  <button type="button" className={styles.inlineAction} onClick={removePicture} disabled={uploading || pending}>
                    Şəkli sil
                  </button>
                )}
              </div>
              <p id={`${id}-picture-hint`} className={form.hint}>
                JPG, PNG və ya WebP, ən çox 4 MB.
              </p>
              {pictureError && (
                <p id={`${id}-picture-error`} className={form.fieldError} role="alert">
                  {pictureError}
                </p>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_MIME_TYPES.join(',')}
              onChange={pickPicture}
              hidden
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

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
            disabled={pending || uploading || !changed}
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
