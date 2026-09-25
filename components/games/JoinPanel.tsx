'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useId, useState, useTransition } from 'react'

import { ApiError, postJson } from '@/lib/api-client'
import type { CurrentUser, GameDetail } from '@/lib/api-types'
import { normalizePhone } from '@/lib/game-backend'
import { formatLocalPhone, PHONE_ERROR, PHONE_PREFIX } from '@/lib/phone'
import { loginHref } from '@/lib/safe-redirect'
import { buttonClass } from '@/components/ui/button'
import form from '@/components/ui/form.module.css'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Avatar } from './bits'
import styles from './JoinPanel.module.css'
import { STATUS_LABELS } from './sports'

/** Errors after which the page data is stale (spot taken, already a player, game closed). */
const REFRESH_ON = new Set(['ALREADY_JOINED', 'GAME_FULL', 'GAME_NOT_JOINABLE'])

const NAME_ERROR = 'Ad və soyadınızı daxil edin.'

type Step = 'details' | 'confirm'

/**
 * The join button and the two-step join modal.
 *
 * Step 1 ("Oyuna qoşul") collects the player's name and phone; nothing is sent yet. Step 2
 * ("Bir addım qaldı") shows the host and calls `POST /api/v1/games/{id}/join` with what step 1
 * collected. On success the modal closes and the page refreshes, which shows the new player count
 * and reveals the host's phone.
 */
export function JoinPanel({ game, user, autoOpen }: { game: GameDetail; user: CurrentUser | null; autoOpen: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const id = useId()

  const canJoin = game.status === 'open' && !game.viewer.joined && !game.viewer.isHost
  const [open, setOpen] = useState(autoOpen && canJoin && Boolean(user))
  const [step, setStep] = useState<Step>('details')
  // Prefilled from the profile, but the player can give a different name or number for this game.
  const [name, setName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(formatLocalPhone(user?.phoneNumber ?? ''))
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // Set the moment the join succeeds, so the button can't be pressed again while the page refreshes.
  const [justJoined, setJustJoined] = useState(false)
  const [, startRefresh] = useTransition()
  const joined = game.viewer.joined || justJoined

  // Drop ?join=1 so a reload doesn't reopen the modal.
  useEffect(() => {
    if (autoOpen) window.history.replaceState(null, '', pathname)
  }, [autoOpen, pathname])

  const joinUrl = `${pathname}?join=1`

  function openModal() {
    if (!user) {
      router.push(loginHref(joinUrl))
      return
    }
    setStep('details')
    setErrors({})
    setError(null)
    setOpen(true)
  }

  /** Step 1 → step 2, in the same modal: validate locally, send nothing yet. */
  function submitDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found: { name?: string; phone?: string } = {}
    if (!name.trim()) found.name = NAME_ERROR
    if (!normalizePhone(`${PHONE_PREFIX}${phone}`)) {
      found.phone = phone.trim() ? PHONE_ERROR : 'Telefon nömrənizi daxil edin.'
    }
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const formElement = event.currentTarget
      requestAnimationFrame(() => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setError(null)
    setStep('confirm')
  }

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await postJson(`/api/v1/games/${game.id}/join`, {
        name: name.trim(),
        phone: normalizePhone(`${PHONE_PREFIX}${phone}`),
      })
      setJustJoined(true)
      setOpen(false)
      // Brings in the new player count and the host's phone, which only joined players see.
      startRefresh(() => router.refresh())
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError('Hazırda oyuna qoşulmaq mümkün olmadı.')
      } else if (err.code === 'UNAUTHENTICATED') {
        router.push(loginHref(joinUrl))
      } else if (err.code === 'INVALID_PHONE' || err.code === 'INVALID_NAME') {
        // Server-side validation disagreed: send the player back to the field it belongs to.
        setErrors(err.code === 'INVALID_PHONE' ? { phone: err.message } : { name: err.message })
        setStep('details')
      } else {
        // e.g. 409 GAME_FULL: "Oyunda boş yer qalmayıb."
        setError(err.message)
        if (REFRESH_ON.has(err.code)) router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  const fieldError = (field: 'name' | 'phone') =>
    errors[field] ? (
      <p id={`${id}-${field}-error`} className={form.fieldError}>
        {errors[field]}
      </p>
    ) : null

  return (
    <>
      {game.viewer.isHost ? (
        <p className={styles.state}>Bu oyunun hostu sizsiniz</p>
      ) : joined ? (
        <p className={`${styles.state} ${styles.joined}`} role={justJoined ? 'status' : undefined}>
          <span className={`${styles.check} ${justJoined ? styles.checkPop : ''}`} aria-hidden="true">
            ✓
          </span>
          Siz bu oyuna qoşulmusunuz
        </p>
      ) : game.status !== 'open' ? (
        <button type="button" className={buttonClass('muted', 'lg', { block: true, className: styles.cta })} disabled>
          {STATUS_LABELS[game.status]}
        </button>
      ) : (
        // On phones this docks to the bottom of the screen, so joining never needs a scroll.
        <div className={styles.dock} data-join-dock>
          <button
            type="button"
            className={buttonClass('primary', 'lg', { block: true, className: styles.cta })}
            onClick={openModal}
            aria-haspopup="dialog"
          >
            Qoşul - {game.remainingSpots} yer qalıb
            <Icon name="arrowRight" className={styles.ctaArrow} />
          </button>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={step === 'details' ? 'Oyuna qoşul' : 'Bir addım qaldı'}
        focusKey={step}
      >
        {step === 'details' ? (
          <form className={styles.body} onSubmit={submitDetails} noValidate>
            <hr className={styles.divider} />
            <p className={styles.note}>
              Host sizi tanıya bilməsi üçün ad və əlaqə nömrənizi qeyd edin.
            </p>

            <div className={form.field}>
              <label htmlFor={`${id}-name`} className={form.labelSmall}>
                Ad Soyad
              </label>
              <input
                id={`${id}-name`}
                className={form.input}
                type="text"
                autoComplete="name"
                placeholder="Adınız və soyadınız"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (errors.name) setErrors((current) => ({ ...current, name: undefined }))
                }}
                required
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${id}-name-error` : undefined}
                data-autofocus
              />
              {fieldError('name')}
            </div>

            <div className={form.field}>
              <label htmlFor={`${id}-phone`} className={form.labelSmall}>
                Telefon nömrəsi
              </label>
              <PhoneInput
                id={`${id}-phone`}
                value={phone}
                onChange={(value) => {
                  setPhone(value)
                  if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }))
                }}
                required
                invalid={Boolean(errors.phone)}
                describedBy={errors.phone ? `${id}-phone-error` : undefined}
              />
              {fieldError('phone')}
            </div>

            {error && (
              <p className={form.alert} role="alert">
                {error}
              </p>
            )}

            <button type="submit" className={buttonClass('primary', 'xl', { block: true })}>
              Qoşul
            </button>
          </form>
        ) : (
          <div className={styles.body}>
            <hr className={styles.divider} />
            <div className={styles.hostGroup}>
              <p className={styles.groupLabel}>Oyun təşkilatçısı</p>
              <div className={styles.hostBadge}>
                <Avatar person={game.host} size={44} decorative />
                <div className={styles.hostText}>
                  <p className={styles.hostName}>{game.host.name}</p>
                  <p className={styles.active}>
                    <span className={styles.activeDot} aria-hidden="true" />
                    Aktiv təşkilatçı
                  </p>
                </div>
              </div>
            </div>
            <p className={styles.note}>
              Təsdiq etdikdən sonra hostun əlaqə nömrəsi oyun səhifəsində görünəcək. Zəhmət olmasa host ilə əlaqə
              saxlayıb oyuna gələcəyinizi təsdiq edin.
            </p>

            {error && (
              <p className={form.alert} role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              className={buttonClass('primary', 'xl', { block: true })}
              onClick={confirm}
              disabled={pending}
              aria-busy={pending}
              data-autofocus
            >
              {pending ? 'Təsdiq edilir…' : 'Qoşulmanı təsdiq et'}
            </button>
            <button type="button" className={styles.back} onClick={() => setStep('details')} disabled={pending}>
              ← Məlumatları dəyiş
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
