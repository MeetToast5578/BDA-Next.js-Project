'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { ApiError, postJson } from '@/lib/api-client'
import { loginHref } from '@/lib/safe-redirect'
import { buttonClass } from '@/components/ui/button'
import danger from '@/components/ui/danger.module.css'
import form from '@/components/ui/form.module.css'
import { Modal } from '@/components/ui/Modal'

/** Errors after which the page is out of date (already out, already started, gone): re-read it. */
const REFRESH_ON = new Set(['NOT_JOINED', 'GAME_STARTED', 'GAME_NOT_FOUND'])

/**
 * "Oyundan çıx" for a player who joined a game that hasn't started. Confirms first, then
 * `POST /api/v1/games/{id}/leave` hands the spot back and the page refreshes into its join state.
 * That refresh unmounts this component, so `onLeft` is where the caller announces it.
 */
export function LeaveGame({ gameId, onLeft }: { gameId: string; onLeft: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startRefresh] = useTransition()

  async function leave() {
    setPending(true)
    setError(null)
    try {
      await postJson(`/api/v1/games/${gameId}/leave`)
      setOpen(false)
      onLeft()
      // Brings back the join button, the new player count and hides the host's phone again.
      startRefresh(() => router.refresh())
    } catch (err) {
      if (err instanceof ApiError && err.code === 'UNAUTHENTICATED') {
        router.push(loginHref(pathname))
        return
      }
      setError(err instanceof Error ? err.message : 'Oyundan çıxmaq mümkün olmadı.')
      if (err instanceof ApiError && REFRESH_ON.has(err.code)) router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={buttonClass('outlinePrimary', 'lg', { block: true })}
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
        aria-haspopup="dialog"
      >
        Oyundan çıx
      </button>

      <Modal
        open={open}
        onClose={() => {
          if (!pending) setOpen(false)
        }}
        title="Oyundan çıxmaq istəyirsiniz?"
      >
        <div className={danger.confirm}>
          <p className={danger.dangerText}>
            Yeriniz digər oyunçulara açılacaq. Gəlməyəcəyinizi hosta da xəbər verməyi unutmayın.
          </p>
          {error && (
            <p className={form.alert} role="alert">
              {error}
            </p>
          )}
          <div className={danger.confirmActions}>
            {/* Focus starts on staying, so Enter never gives the spot away by accident. */}
            <button
              type="button"
              className={buttonClass('muted', 'lg')}
              onClick={() => setOpen(false)}
              disabled={pending}
              data-autofocus
            >
              İmtina et
            </button>
            <button type="button" className={buttonClass('danger', 'lg')} onClick={leave} disabled={pending} aria-busy={pending}>
              {pending ? 'Çıxılır…' : 'Bəli, çıx'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
