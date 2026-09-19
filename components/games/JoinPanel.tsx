'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ApiError, postJson } from '@/lib/api-client'
import type { CurrentUser, GameDetail } from '@/lib/api-types'
import { loginHref } from '@/lib/safe-redirect'
import { buttonClass } from '@/components/ui/button'
import form from '@/components/ui/form.module.css'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from './bits'
import styles from './JoinPanel.module.css'
import { STATUS_LABELS } from './sports'

/** Errors after which the page data is stale (spot taken, already a player, game closed). */
const REFRESH_ON = new Set(['ALREADY_JOINED', 'GAME_FULL', 'GAME_NOT_JOINABLE'])

/**
 * The join button and the "Bir addım qaldı" modal. "Qoşulmanı təsdiq et" calls
 * `POST /api/v1/games/{id}/join`; on success the modal closes and the page refreshes, which shows the
 * new player count and reveals the host's phone.
 */
export function JoinPanel({ game, user, autoOpen }: { game: GameDetail; user: CurrentUser | null; autoOpen: boolean }) {
  const router = useRouter()
  const pathname = usePathname()

  const canJoin = game.status === 'open' && !game.viewer.joined && !game.viewer.isHost
  const [open, setOpen] = useState(autoOpen && canJoin && Boolean(user))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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
    setError(null)
    setOpen(true)
  }

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await postJson(`/api/v1/games/${game.id}/join`)
      setOpen(false)
      router.refresh()
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError('Hazırda oyuna qoşulmaq mümkün olmadı.')
      } else if (err.code === 'UNAUTHENTICATED') {
        router.push(loginHref(joinUrl))
      } else {
        // e.g. 409 GAME_FULL: "Oyunda boş yer qalmayıb."
        setError(err.message)
        if (REFRESH_ON.has(err.code)) router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

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
        <button type="button" className={buttonClass('muted', 'lg', { block: true, className: styles.cta })} disabled>
          {STATUS_LABELS[game.status]}
        </button>
      ) : (
        <button
          type="button"
          className={buttonClass('primary', 'lg', { block: true, className: styles.cta })}
          onClick={openModal}
          aria-haspopup="dialog"
        >
          Qoşul - {game.remainingSpots} yer qalıb
          <Icon name="arrowRight" />
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Bir addım qaldı">
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
        </div>
      </Modal>
    </>
  )
}
