'use client'

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'

import { addDays, addMonths, monthCells, pad, type TimeFormat } from '@/lib/date-input'
import { MONTHS_LONG, WEEKDAYS_SHORT } from '@/lib/game-backend'
import { Icon } from '@/components/ui/Icon'
import styles from './Pickers.module.css'

// The browser's own pickers follow the OS locale (an AM/PM clock even when the form says 24 saat) and
// can't be styled, so the date and time fields open these instead. Typing in the field still works.

const WEEK = [...WEEKDAYS_SHORT.slice(1), WEEKDAYS_SHORT[0]] // Monday first
const ARROWS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

type PopoverProps = {
  id: string
  /** The field around the input, its button and the popover: presses and focus inside it keep it open. */
  anchor: RefObject<HTMLElement | null>
  /** Opened from its button, so focus moves in; opened by clicking the input, typing carries on. */
  autoFocus: boolean
  /** `refocus`: hand focus back to the button, because it was inside the popover. */
  onClose: (refocus: boolean) => void
  align?: 'start' | 'end'
}

/** Closes on Escape and on a press or focus outside `anchor`. */
function useDismiss(anchor: PopoverProps['anchor'], popover: RefObject<HTMLElement | null>, onClose: PopoverProps['onClose']) {
  useEffect(() => {
    const outside = (event: Event) => {
      if (!anchor.current?.contains(event.target as Node)) onClose(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose(popover.current?.contains(document.activeElement) ?? false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [anchor, popover, onClose])
}

/** Month grid from `today` onwards; arrow keys move between days, Enter picks. */
export function CalendarPopover({
  id,
  anchor,
  autoFocus,
  onClose,
  align = 'start',
  value,
  today,
  onSelect,
}: PopoverProps & { value: string; today: string; onSelect: (isoDate: string) => void }) {
  const root = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  useDismiss(anchor, root, onClose)

  const start = value && value >= today ? value : today
  const [month, setMonth] = useState(start.slice(0, 7))
  const [active, setActive] = useState(start) // the day Tab lands on
  const [slide, setSlide] = useState<'next' | 'prev' | null>(null)
  const pendingFocus = useRef(autoFocus)

  function turnTo(day: string) {
    const next = day.slice(0, 7)
    if (next !== month) setSlide(next > month ? 'next' : 'prev')
    setMonth(next)
    setActive(day)
  }

  // A date typed while the calendar is open turns it to that month.
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    if (value >= today) turnTo(value)
  }

  function changeMonth(by: number) {
    const next = addMonths(month, by)
    setSlide(by > 0 ? 'next' : 'prev')
    setMonth(next)
    setActive(`${next}-01` < today ? today : `${next}-01`)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const by = ARROWS[event.key]
    if (by === undefined) return
    event.preventDefault()
    const next = addDays(active, by)
    if (next < today) return
    pendingFocus.current = true
    turnTo(next)
  }

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
  }, [active])

  const [year, monthIndex] = month.split('-').map(Number)
  const monthName = MONTHS_LONG[monthIndex - 1]

  return (
    <div ref={root} id={id} role="dialog" aria-label="Tarix seçin" tabIndex={-1} className={`${styles.popover} ${styles[align]}`}>
      <div className={styles.head}>
        <button
          type="button"
          className={`${styles.nav} ${styles.back}`}
          onClick={() => changeMonth(-1)}
          disabled={month <= today.slice(0, 7)}
          aria-label="Əvvəlki ay"
        >
          <Icon name="chevron" />
        </button>
        <p key={month} className={styles.monthTitle} aria-live="polite">
          {monthName} {year}
        </p>
        <button type="button" className={styles.nav} onClick={() => changeMonth(1)} aria-label="Növbəti ay">
          <Icon name="chevron" />
        </button>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {WEEK.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div key={month} ref={grid} className={`${styles.days} ${slide ? styles[slide] : ''}`} onKeyDown={onKeyDown}>
        {monthCells(month).map((day, index) =>
          day === null ? (
            <span key={`blank-${index}`} />
          ) : (
            <button
              key={day}
              type="button"
              className={`${styles.day} ${day === today ? styles.today : ''}`}
              tabIndex={day === active ? 0 : -1}
              disabled={day < today}
              aria-pressed={day === value}
              aria-current={day === today ? 'date' : undefined}
              aria-label={`${Number(day.slice(8))} ${monthName} ${year}`}
              onClick={() => onSelect(day)}
            >
              {Number(day.slice(8))}
            </button>
          ),
        )}
      </div>

      <div className={styles.foot}>
        <button type="button" className={styles.chip} onClick={() => onSelect(today)}>
          Bu gün
        </button>
        <button type="button" className={styles.chip} onClick={() => onSelect(addDays(today, 1))}>
          Sabah
        </button>
      </div>
    </div>
  )
}

const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5)
const HOURS_12 = Array.from({ length: 12 }, (_, index) => index || 12) // 12, 1, 2 … 11

/**
 * Hour, then minute. 24 saat shows 00–23; 12 saat shows 1–12 with an AM/PM switch. `onSelect` gets
 * "HH:mm" either way, and `done` once a minute is picked. Times `isPast` says have gone are grayed
 * out, and nothing here ever picks one.
 */
export function TimePopover({
  id,
  anchor,
  autoFocus,
  onClose,
  align = 'start',
  value,
  format,
  onSelect,
  isPast = () => false,
}: PopoverProps & {
  value: string
  format: TimeFormat
  onSelect: (time: string, done: boolean) => void
  /** Whether "HH:mm" on the chosen date has already gone. */
  isPast?: (time: string) => boolean
}) {
  const root = useRef<HTMLDivElement>(null)
  const cells = useRef<HTMLDivElement>(null)
  useDismiss(anchor, root, onClose)

  const [hours, minutes] = value ? value.split(':').map(Number) : [null, null]
  // The half the 12-hour grid shows: the chosen time's, unless AM/PM was flipped to a half the time
  // can't move to. With nothing picked it starts on PM: most games are in the afternoon or evening.
  const [half, setHalf] = useState<'am' | 'pm' | null>(null)
  const pm = half ? half === 'pm' : hours === null || hours >= 12
  const showsValue = hours !== null && pm === hours >= 12
  const [chosenStep, setStep] = useState<'hour' | 'minute'>('hour')
  const step = showsValue ? chosenStep : 'hour'
  const pendingFocus = useRef(autoFocus)

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    const current = cells.current?.querySelector<HTMLElement>('[aria-pressed="true"]:not(:disabled)')
    ;(current ?? cells.current?.querySelector<HTMLElement>('button:not(:disabled)'))?.focus()
  }, [step])

  function choosePm(next: boolean) {
    const flipped = hours === null ? null : `${pad((hours % 12) + (next ? 12 : 0))}:${pad(minutes ?? 0)}`
    // The time moves to the other half, unless it has gone there: then only the grid switches.
    if (flipped && !isPast(flipped)) {
      setHalf(null)
      onSelect(flipped, false)
    } else {
      setHalf(next ? 'pm' : 'am')
    }
  }

  // An hour has gone once its last slot (:55) has.
  const hourValues =
    format === '24h' ? Array.from({ length: 24 }, (_, hour) => hour) : HOURS_12.map((hour) => (hour % 12) + (pm ? 12 : 0))
  const choices =
    step === 'minute'
      ? MINUTES.map((minute) => ({
          label: pad(minute),
          value: minute,
          pressed: minute === minutes,
          past: isPast(`${pad(hours!)}:${pad(minute)}`),
        }))
      : hourValues.map((hour) => ({
          label: format === '24h' ? pad(hour) : String(hour % 12 || 12),
          value: hour,
          pressed: hour === hours,
          past: isPast(`${pad(hour)}:55`),
        }))

  function choose(choice: number) {
    if (step === 'hour') {
      // The minutes picked so far stay, unless that time has gone: then the first minute left in the hour.
      const kept = minutes ?? 0
      const minute = isPast(`${pad(choice)}:${pad(kept)}`)
        ? (MINUTES.find((m) => !isPast(`${pad(choice)}:${pad(m)}`)) ?? kept)
        : kept
      setHalf(null)
      onSelect(`${pad(choice)}:${pad(minute)}`, false)
      pendingFocus.current = true
      setStep('minute')
    } else {
      onSelect(`${pad(hours!)}:${pad(choice)}`, true)
    }
  }

  const hourText = hours === null || !showsValue ? '--' : format === '24h' ? pad(hours) : String(hours % 12 || 12)

  return (
    <div ref={root} id={id} role="dialog" aria-label="Saat seçin" tabIndex={-1} className={`${styles.popover} ${styles[align]}`}>
      <div className={`${styles.head} ${styles.clockHead}`}>
        <div className={styles.display}>
          <button
            type="button"
            className={styles.part}
            aria-pressed={step === 'hour'}
            onClick={() => setStep('hour')}
            aria-label="Saatı seç"
          >
            {hourText}
          </button>
          <span className={styles.colon} aria-hidden="true">
            :
          </span>
          <button
            type="button"
            className={styles.part}
            aria-pressed={step === 'minute'}
            onClick={() => setStep('minute')}
            disabled={!showsValue}
            aria-label="Dəqiqəni seç"
          >
            {minutes === null || !showsValue ? '--' : pad(minutes)}
          </button>
        </div>
        {format === '12h' && (
          <div className={`${styles.toggle} ${styles.toggleOnDark}`} role="radiogroup" aria-label="Günün yarısı">
            {(['AM', 'PM'] as const).map((label) => (
              <label key={label} className={styles.toggleOption}>
                <input
                  type="radio"
                  name={`${id}-meridiem`}
                  checked={pm === (label === 'PM')}
                  onChange={() => choosePm(label === 'PM')}
                  disabled={isPast(label === 'PM' ? '23:55' : '11:55')}
                />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      <p className={styles.stepLabel}>{step === 'hour' ? 'Saat' : 'Dəqiqə'}</p>
      <div key={step} ref={cells} className={styles.cells}>
        {choices.map((choice, index) => (
          <button
            key={choice.label}
            type="button"
            className={styles.cell}
            style={{ '--i': index } as CSSProperties}
            aria-pressed={choice.pressed}
            disabled={choice.past}
            onClick={() => choose(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  )
}
