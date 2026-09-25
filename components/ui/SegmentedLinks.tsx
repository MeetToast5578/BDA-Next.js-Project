'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOptimistic, useTransition } from 'react'

import segmented from './segmented.module.css'

/**
 * Two or more views of one list as segment links ("Qarşıdakı / Keçmiş"). Like the sport tabs, the
 * chosen segment lights up on the click itself and `data-pending` on the nav lets the page dim the
 * old list until the new one arrives. Each segment is a real page, so it pushes a history entry.
 */
export function SegmentedLinks({
  label,
  options,
}: {
  label: string
  options: Array<{ href: string; label: string; active: boolean }>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [shown, setShown] = useOptimistic(options.findIndex((option) => option.active))

  function select(event: React.MouseEvent<HTMLAnchorElement>, index: number, href: string) {
    // Let the browser handle "open in new tab" and friends.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    if (index === shown) return
    startTransition(() => {
      setShown(index)
      router.push(href, { scroll: false })
    })
  }

  return (
    <nav aria-label={label} data-pending={pending || undefined}>
      <ul className={segmented.segments}>
        {options.map((option, index) => (
          <li key={option.href}>
            <Link
              href={option.href}
              scroll={false}
              className={`${segmented.segment} ${index === shown ? segmented.segmentActive : ''}`}
              aria-current={index === shown ? 'page' : undefined}
              onClick={(event) => select(event, index, option.href)}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
