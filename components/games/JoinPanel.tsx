'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useId, useState } from 'react'

import { ApiError, postJson } from '@/lib/api-client'
import type { CurrentUser, GameDetail, JoinResponse } from '@/lib/api-types'
import { normalizePhone } from '@/lib/game-backend'
import { formatPhone, PHONE_ERROR, PHONE_PLACEHOLDER } from '@/lib/phone'
import { loginHref } from '@/lib/safe-redirect'
import { buttonClass } from '@/components/ui/button'
import form from '@/components/ui/form.module.css'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from './bits'
import styles from './JoinPanel.module.css'
import { STATUS_LABELS } from './sports'

type Step = 'idle' | 'form' | 'done'

/** Errors after which the page data is stale (spot taken, already a player, game closed). */
const REFRESH_ON = new Set(['ALREADY_JOINED', 'GAME_FULL', 'GAME_NOT_JOINABLE'])

/**
 * The join button and its two modals. `POST /api/v1/games/{id}/join` takes the spot when "Qoşul" is
 * submitted; "Bir addım qaldı" then shows the host's phone, and its button only closes the modal.
 */
export function JoinPanel({ game, user, autoOpen }: { game: GameDetail; user: CurrentUser | null; autoOpen: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const nameId = useId()
  const phoneId = useId()
  const phoneErrorId = useId()

  const canJoin = game.status === 'open' && !game.viewer.joined && !game.viewer.isHost
  const [step, setStep] = useState<Step>(autoOpen && canJoin && user ? 'form' : 'idle')
  const [phone, setPhone] = useState(user?.phoneNumber ? formatPhone(user.phoneNumber) : '')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [joinedGame, setJoinedGame] = useState<GameDetail | null>(null)

  // Drop ?join=1 so a reload doesn't reopen the modal.
  useEffect(() => {
    if (autoOpen) window.history.replaceState(null, '', pathname)
  }, [autoOpen, pathname])

  const joinUrl = `${pathname}?join=1`

  function open() {
    if (!user) {
      router.push(loginHref(joinUrl))
      return
    }
    setError(null)
    setPhoneError(null)
    setStep('form')
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!normalizePhone(phone)) {
      setPhoneError(PHONE_ERROR)
      return
    }

    setPending(true)
    setError(null)
    setPhoneError(null)
    try {
      const result = await postJson<JoinResponse>(`/api/v1/games/${game.id}/join`, { phone })
      setJoinedGame(result.game)
      setStep('done')
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError('Hazırda oyuna qoşulmaq mümkün olmadı.')
      } else if (err.code === 'UNAUTHENTICATED') {
        router.push(loginHref(joinUrl))
      } else if (err.code === 'INVALID_PHONE') {
        setPhoneError(err.message)
      } else {
        setError(err.message)
        if (REFRESH_ON.has(err.code)) router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  function finish() {
    setStep('idle')
    router.refresh()
  }

  const host = joinedGame?.host ?? game.host

  return (
    <>
      {game.viewer.isHost ? (
        <p className={styles.state}>Bu oyunun hostu sizsiniz</p>
      ) : game.viewer.joined ? (
        <p className={`${styles.state} ${styles.joined}`}>
          <span className={styles.check} aria-hidden="true">
            ✓
          </span>
          Siz bu oyuna qoşulmusunuz
        </p>
      ) : game.status !== 'open' ? (
        <p className={styles.state}>{STATUS_LABELS[game.status]}</p>
      ) : (
        <button
          type="button"
          className={buttonClass('primary', 'lg', { block: true, className: styles.cta })}
          onClick={open}
          aria-haspopup="dialog"
        >
          Qoşul - {game.remainingSpots} yer qalıb
          <Icon name="arrowRight" />
        </button>
      )}

      <Modal
        open={step === 'form'}
        onClose={() => setStep('idle')}
        title="Oyuna qoşul"
        subtitle="Qoşulmaq üçün məlumatlarını daxil et:"
      >
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.fields}>
            <div className={form.field}>
              <label htmlFor={nameId} className={form.label}>
                Ad Soyad
              </label>
              <input
                id={nameId}
                className={form.input}
                value={user?.fullName ?? ''}
                placeholder="Adınız və soyadınız"
                readOnly
                aria-describedby={`${nameId}-hint`}
              />
              <p id={`${nameId}-hint`} className={form.hint}>
                Hesabınızdakı ad istifadə olunur.
              </p>
            </div>
            <div className={form.field}>
              <label htmlFor={phoneId} className={form.label}>
                Telefon nömrəsi
              </label>
              <input
                id={phoneId}
                className={form.input}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={PHONE_PLACEHOLDER}
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  setPhoneError(null)
                }}
                required
                data-autofocus
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={phoneError ? phoneErrorId : undefined}
              />
              {phoneError && (
                <p id={phoneErrorId} className={form.fieldError}>
                  {phoneError}
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className={form.alert} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={buttonClass('primary', 'xl', { block: true })}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? 'Qoşulur…' : 'Qoşul'}
          </button>
        </form>
      </Modal>

      <Modal
        open={step === 'done'}
        onClose={finish}
        title="Bir addım qaldı"
        subtitle="Aşağıdakı nömrədən Host ilə əlaqə saxla:"
      >
        <div className={styles.success}>
          <hr className={styles.divider} />
          <div className={styles.hostGroup}>
            <p className={styles.groupLabel}>Oyun təşkilatçısı</p>
            <div className={styles.hostBadge}>
              <Avatar person={host} size={44} decorative />
              <div className={styles.hostText}>
                <p className={styles.hostName}>{host.name}</p>
                <p className={styles.active}>
                  <span className={styles.activeDot} aria-hidden="true" />
                  Aktiv təşkilatçı
                </p>
              </div>
              {host.phone ? (
                <a className={styles.phone} href={`tel:${host.phone}`}>
                  {formatPhone(host.phone)}
                </a>
              ) : (
                <p className={form.hint}>Nömrə tezliklə oyun səhifəsində görünəcək.</p>
              )}
            </div>
          </div>
          <p className={styles.note}>
            Zəhmət olmasa host ilə əlaqə saxlayıb oyuna gələcəyinizi təsdiq edin.
          </p>
          <button type="button" className={buttonClass('primary', 'xl', { block: true })} onClick={finish}>
            Qoşulmanı təsdiq et
          </button>
        </div>
      </Modal>
    </>
  )
}
