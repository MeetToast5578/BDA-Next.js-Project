'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'

import { ApiError, postJson } from '@/lib/api-client'
import type { CreateGameRequest, CurrentUser, GameDetail, Venue } from '@/lib/api-types'
import { normalizePhone } from '@/lib/game-backend'
import { formatPhone, PHONE_ERROR, PHONE_PLACEHOLDER } from '@/lib/phone'
import { loginHref } from '@/lib/safe-redirect'
import { LEVEL_OPTIONS, SPORT_EMOJI, SPORT_LABELS, SPORT_ORDER } from '@/components/games/sports'
import { buttonClass } from '@/components/ui/button'
import form from '@/components/ui/form.module.css'
import styles from './CreateGameForm.module.css'
import { VenuePicker } from './VenuePicker'

type Field = 'hostPhone' | 'venue' | 'date' | 'time' | 'currentCount' | 'maxCount' | 'title'
type Errors = Partial<Record<Field, string>>

/** API error codes of `POST /api/v1/games` → the field they belong to and an Azerbaijani message. */
const API_ERRORS: Record<string, { field?: Field; message: string }> = {
  INVALID_VENUE: { field: 'venue', message: 'Meydança seçin.' },
  VENUE_NOT_FOUND: { field: 'venue', message: 'Meydança tapılmadı. Başqa meydança seçin.' },
  VENUE_SPORT_MISMATCH: { field: 'venue', message: 'Bu meydançada seçilmiş idman növü oynanmır.' },
  INVALID_DATE: { field: 'date', message: 'Tarix və saatı daxil edin.' },
  DATE_IN_PAST: { field: 'time', message: 'Oyunun vaxtı gələcəkdə olmalıdır.' },
  INVALID_MAX_COUNT: { field: 'maxCount', message: 'Maksimum iştirakçı sayı 1 ilə 100 arasında olmalıdır.' },
  INVALID_CURRENT_COUNT: { field: 'currentCount', message: 'Mövcud iştirakçı sayı maksimumdan az olmalıdır.' },
  INVALID_PHONE: { field: 'hostPhone', message: PHONE_ERROR },
  PHONE_REQUIRED: { field: 'hostPhone', message: 'Host telefon nömrəsi tələb olunur.' },
  INVALID_SPORT: { message: 'İdman növünü seçin.' },
  INVALID_LEVEL: { message: 'Oyun səviyyəsini seçin.' },
}

function venueOffers(venue: Venue, sport: string) {
  return venue.sportTypes.length === 0 || venue.sportTypes.includes(sport)
}

export function CreateGameForm({ user, today }: { user: CurrentUser; today: string }) {
  const router = useRouter()
  const baseId = useId()
  const ids = Object.fromEntries(
    ['name', 'phone', 'date', 'time', 'current', 'max', 'title', 'venue'].map((key) => [key, `${baseId}-${key}`]),
  ) as Record<'name' | 'phone' | 'date' | 'time' | 'current' | 'max' | 'title' | 'venue', string>

  const [sport, setSport] = useState('football')
  const [level, setLevel] = useState('medium')
  const [venue, setVenue] = useState<Venue | null>(null)
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('')
  const [currentCount, setCurrentCount] = useState('0')
  const [maxCount, setMaxCount] = useState('10')
  const [hostPhone, setHostPhone] = useState(user.phoneNumber ? formatPhone(user.phoneNumber) : '')
  const [title, setTitle] = useState('')

  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function chooseSport(next: string) {
    setSport(next)
    // A venue that doesn't host the new sport would be rejected by the API.
    if (venue && !venueOffers(venue, next)) setVenue(null)
  }

  function validate(): Errors {
    const found: Errors = {}
    const max = Number(maxCount)
    const current = Number(currentCount)
    if (!normalizePhone(hostPhone)) found.hostPhone = hostPhone.trim() ? PHONE_ERROR : 'Host telefon nömrəsi tələb olunur.'
    if (!venue?.id) found.venue = 'Meydança seçin.'
    if (!date) found.date = 'Tarixi seçin.'
    if (!time) found.time = 'Saatı seçin.'
    else if (date && new Date(`${date}T${time}:00+04:00`).getTime() <= Date.now()) {
      found.time = 'Oyunun vaxtı gələcəkdə olmalıdır.'
    }
    if (!Number.isInteger(max) || max < 1 || max > 100) {
      found.maxCount = 'Maksimum iştirakçı sayı 1 ilə 100 arasında olmalıdır.'
    }
    if (!Number.isInteger(current) || current < 0 || (Number.isInteger(max) && current >= max)) {
      found.currentCount = 'Mövcud iştirakçı sayı maksimumdan az olmalıdır.'
    }
    return found
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Submit is a discrete event, so React has committed the error state by the next frame.
      const formElement = event.currentTarget
      requestAnimationFrame(() => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    const body: CreateGameRequest = {
      sport,
      level,
      venueId: Number(venue!.id),
      scheduledDate: date,
      scheduledTime: time,
      currentCount: Number(currentCount),
      maxCount: Number(maxCount),
      hostPhone,
      ...(title.trim() ? { title: title.trim() } : {}),
    }

    setPending(true)
    try {
      const { game } = await postJson<{ game: GameDetail }>('/api/v1/games', body)
      router.push(`/games/${game.id}`)
      router.refresh()
    } catch (err) {
      setPending(false)
      if (err instanceof ApiError && err.code === 'UNAUTHENTICATED') {
        router.push(loginHref('/games/new'))
        return
      }
      const known = err instanceof ApiError ? API_ERRORS[err.code] : undefined
      if (known?.field) setErrors({ [known.field]: known.message })
      else setFormError(known?.message ?? (err instanceof Error ? err.message : 'Oyun yaratmaq mümkün olmadı.'))
    }
  }

  /** Updates a field and drops its error, so a corrected field stops showing the old message. */
  const edit = (field: Field, set: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    set(event.target.value)
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const invalid = (field: Field) => (errors[field] ? true : undefined)
  const describe = (field: Field, id: string) => (errors[field] ? `${id}-error` : undefined)
  const fieldError = (field: Field, id: string) =>
    errors[field] ? (
      <p id={`${id}-error`} className={form.fieldError}>
        {errors[field]}
      </p>
    ) : null

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <section className={styles.section} aria-labelledby="host-section">
        <h2 id="host-section" className="visually-hidden">
          Host məlumatları
        </h2>
        <div className={form.row}>
          <div className={form.field}>
            <label htmlFor={ids.name} className={form.labelSmall}>
              Ad Soyad (Host)
            </label>
            <input id={ids.name} className={`${form.input} ${form.inputCompact}`} value={user.fullName} readOnly />
          </div>
          <div className={form.field}>
            <label htmlFor={ids.phone} className={form.labelSmall}>
              Host telefon nömrəsi
            </label>
            <input
              id={ids.phone}
              className={`${form.input} ${form.inputCompact}`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={PHONE_PLACEHOLDER}
              value={hostPhone}
              onChange={edit('hostPhone', setHostPhone)}
              required
              aria-invalid={invalid('hostPhone')}
              aria-describedby={describe('hostPhone', ids.phone)}
            />
            {fieldError('hostPhone', ids.phone)}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="game-section">
        <h2 id="game-section" className="visually-hidden">
          Oyun məlumatları
        </h2>

        <fieldset className={form.field}>
          <legend className={form.labelSmall} style={{ marginBottom: 8 }}>
            İdman növü
          </legend>
          <div className={styles.choices}>
            {SPORT_ORDER.map((value) => (
              <label key={value} className={`${styles.choice} ${styles.sportChoice}`}>
                <input
                  type="radio"
                  name="sport"
                  value={value}
                  checked={sport === value}
                  onChange={() => chooseSport(value)}
                />
                <span className={styles.emoji} aria-hidden="true">
                  {SPORT_EMOJI[value]}
                </span>
                <span className={styles.choiceLabel}>{SPORT_LABELS[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <VenuePicker
          sport={sport}
          value={venue}
          onChange={(next) => {
            setVenue(next)
            setErrors((current) => ({ ...current, venue: undefined }))
          }}
          error={errors.venue}
          errorId={`${ids.venue}-error`}
        />

        <div className={form.row}>
          <div className={form.field}>
            <label htmlFor={ids.date} className={form.labelSmall}>
              Tarix
            </label>
            <input
              id={ids.date}
              className={`${form.input} ${form.inputCompact}`}
              type="date"
              min={today}
              value={date}
              onChange={edit('date', setDate)}
              required
              aria-invalid={invalid('date')}
              aria-describedby={describe('date', ids.date)}
            />
            {fieldError('date', ids.date)}
          </div>
          <div className={form.field}>
            <label htmlFor={ids.time} className={form.labelSmall}>
              Saat
            </label>
            <input
              id={ids.time}
              className={`${form.input} ${form.inputCompact}`}
              type="time"
              step={300}
              value={time}
              onChange={edit('time', setTime)}
              required
              aria-invalid={invalid('time')}
              aria-describedby={describe('time', ids.time)}
            />
            {fieldError('time', ids.time)}
          </div>
        </div>

        <div className={styles.counts}>
          <div className={form.field}>
            <label htmlFor={ids.current} className={form.labelSmall}>
              Mövcud iştirakçı sayı
            </label>
            <input
              id={ids.current}
              className={`${form.input} ${form.inputCompact}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={Math.max(0, Number(maxCount) - 1)}
              value={currentCount}
              onChange={edit('currentCount', setCurrentCount)}
              aria-invalid={invalid('currentCount')}
              aria-describedby={describe('currentCount', ids.current)}
            />
            {fieldError('currentCount', ids.current)}
          </div>
          <div className={form.field}>
            <label htmlFor={ids.max} className={form.labelSmall}>
              Maksimum iştirakçı sayı
            </label>
            <input
              id={ids.max}
              className={`${form.input} ${form.inputCompact}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={maxCount}
              onChange={edit('maxCount', setMaxCount)}
              required
              aria-invalid={invalid('maxCount')}
              aria-describedby={describe('maxCount', ids.max)}
            />
            {fieldError('maxCount', ids.max)}
          </div>
        </div>

        <fieldset className={form.field}>
          <legend className={form.labelSmall} style={{ marginBottom: 8 }}>
            Oyun Səviyyəsi
          </legend>
          <div className={`${styles.choices} ${styles.levels}`}>
            {LEVEL_OPTIONS.map((option) => (
              <label key={option.value} className={`${styles.choice} ${styles.levelChoice}`}>
                <input
                  type="radio"
                  name="level"
                  value={option.value}
                  checked={level === option.value}
                  onChange={() => setLevel(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className={form.field}>
          <label htmlFor={ids.title} className={form.labelSmall}>
            Oyunun adı (istəyə bağlı)
          </label>
          <input
            id={ids.title}
            className={`${form.input} ${form.inputCompact}`}
            maxLength={120}
            placeholder={`məs. Cümə axşamı 5-ə-5 — boş qalsa “${SPORT_LABELS[sport]} oyunu”`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
      </section>

      <div className={styles.submitRow}>
        {formError && (
          <p className={form.alert} role="alert">
            {formError}
          </p>
        )}
        {Object.values(errors).some(Boolean) && !formError && (
          <p className="visually-hidden" role="alert">
            Formda səhvlər var. Qeyd olunan xanaları düzəldin.
          </p>
        )}
        <button
          type="submit"
          className={buttonClass('primary', 'xl', { block: true, className: styles.submit })}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? 'Dərc olunur…' : 'Oyunu dərc et'}
        </button>
      </div>
    </form>
  )
}
