'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import styles from './NavigationProgress.module.css'

/** Only navigations slower than this show the bar, so instant ones don't flash it. */
const SHOW_AFTER_MS = 90
/** Gives up on a navigation that never lands (e.g. superseded by another click). */
const GIVE_UP_MS = 12_000

type Phase = 'idle' | 'loading' | 'done'

/** Whether a click on this anchor is an in-app navigation to a different URL. */
function isInAppNavigation(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return false

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return false
  // The admin panel and the API are full-page loads with their own indicators.
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) return false
  return url.pathname !== window.location.pathname || url.search !== window.location.search
}

/**
 * A thin bar along the top of the viewport while a page loads. It starts on the click and finishes
 * when the new URL commits, so there is feedback at once even on a slow network or a cold server.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const phaseRef = useRef<Phase>('idle')
  const timers = useRef<number[]>([])
  const trickle = useRef<number | undefined>(undefined)
  /** The URL the page last committed to, to tell a real back/forward from a #hash step. */
  const committed = useRef('')

  const controls = useRef({
    clear() {
      timers.current.forEach((id) => window.clearTimeout(id))
      timers.current = []
      window.clearInterval(trickle.current)
    },
    set(next: Phase) {
      phaseRef.current = next
      setPhase(next)
    },
    start() {
      controls.current.clear()
      timers.current.push(
        window.setTimeout(() => {
          controls.current.set('loading')
          setProgress(0.12)
          // Eases towards 90% and never gets there, like a load with an unknown end.
          trickle.current = window.setInterval(() => setProgress((value) => value + (0.9 - value) * 0.09), 220)
        }, SHOW_AFTER_MS),
        window.setTimeout(() => controls.current.finish(), GIVE_UP_MS),
      )
    },
    finish() {
      const wasLoading = phaseRef.current === 'loading'
      controls.current.clear()
      if (!wasLoading) return
      controls.current.set('done')
      setProgress(1)
      timers.current.push(
        window.setTimeout(() => {
          controls.current.set('idle')
          setProgress(0)
        }, 400),
      )
    },
  })

  // A new URL committed: complete the bar if one is running.
  useEffect(() => {
    committed.current = `${pathname}?${searchParams}`
    controls.current.finish()
  }, [pathname, searchParams])

  useEffect(() => {
    const { start, clear } = controls.current
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.('a[href]')
      if (anchor instanceof HTMLAnchorElement && isInAppNavigation(event, anchor)) start()
    }
    function onPopState() {
      const { pathname, search } = window.location
      if (`${pathname}?${search.slice(1)}` !== committed.current) start()
    }
    // Capture phase: <Link> cancels the native navigation in its own handler, which runs first
    // in the bubble phase and would make every click look like it went nowhere.
    document.addEventListener('click', onClick, { capture: true })
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      window.removeEventListener('popstate', onPopState)
      clear()
    }
  }, [])

  return (
    <div className={styles.track} data-phase={phase} aria-hidden="true">
      <div className={styles.bar} style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}
