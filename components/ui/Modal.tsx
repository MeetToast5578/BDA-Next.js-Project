'use client'

import { useEffect, useId, useRef } from 'react'

import { Icon } from './Icon'
import styles from './Modal.module.css'

/**
 * Modal built on <dialog>: the browser handles focus trapping, Escape and inert background.
 * Closing (Escape, backdrop click, close button) calls `onClose`. Mark a child `data-autofocus` to focus it on open.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() focuses the first focusable element (the close button); prefer the marked field.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={() => {
        if (open) onClose()
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div className={styles.card}>
          <div className={styles.top}>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Bağla">
              <Icon name="close" />
            </button>
          </div>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
