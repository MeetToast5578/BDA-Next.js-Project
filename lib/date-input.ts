// Client-safe parsing and formatting for the typed date and time fields on "Yeni Oyun Yarat".
// The form keeps what the user typed; the API values (YYYY-MM-DD, HH:mm) are derived from it.

type Part = 'd' | 'm' | 'y'

/** Labels use the Azerbaijani initials: GG = gün, AA = ay, İİİİ = il. */
export const DATE_FORMATS = {
  'dd.mm.yyyy': { label: 'GG.AA.İİİİ', order: ['d', 'm', 'y'], separator: '.' },
  'dd/mm/yyyy': { label: 'GG/AA/İİİİ', order: ['d', 'm', 'y'], separator: '/' },
  'mm/dd/yyyy': { label: 'AA/GG/İİİİ', order: ['m', 'd', 'y'], separator: '/' },
  'yyyy-mm-dd': { label: 'İİİİ-AA-GG', order: ['y', 'm', 'd'], separator: '-' },
} satisfies Record<string, { label: string; order: Part[]; separator: string }>

export type DateFormat = keyof typeof DATE_FORMATS

export const TIME_FORMATS = {
  '24h': { label: '24 saat', example: '19:30' },
  '12h': { label: '12 saat (AM/PM)', example: '7:30 PM' },
}

export type TimeFormat = keyof typeof TIME_FORMATS

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * "19.09.2026" (in `format`'s day/month/year order) → "2026-09-19", or null if it isn't a real date.
 * Any non-digit separates the parts, so "19/9/26" and "19 09 2026" work too; a 2-digit year is 20xx.
 */
export function parseDateText(text: string, format: DateFormat): string | null {
  const parts = text.split(/\D+/).filter(Boolean)
  const { order } = DATE_FORMATS[format]
  if (parts.length !== 3) return null

  const raw = Object.fromEntries(order.map((part, index) => [part, parts[index]])) as Record<Part, string>
  if (raw.y.length !== 2 && raw.y.length !== 4) return null
  const year = Number(raw.y) + (raw.y.length === 2 ? 2000 : 0)
  const month = Number(raw.m)
  const day = Number(raw.d)

  // Date.UTC rolls 31.02 over into March; comparing back catches it.
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

/** "2026-09-19" → "19.09.2026" etc. */
export function formatDateText(isoDate: string, format: DateFormat) {
  const [y, m, d] = isoDate.split('-')
  const values: Record<Part, string> = { y, m, d }
  const { order, separator } = DATE_FORMATS[format]
  return order.map((part) => values[part]).join(separator)
}

/**
 * "19:30", "19.30", "1930", "19", "7:30 PM", "7pm", "7.30 p.m." → "HH:mm", or null. AM/PM is understood in
 * either format; in the 12-hour format an hour from 1 to 12 without it is ambiguous, so it is rejected.
 */
export function parseTimeText(text: string, format: TimeFormat): string | null {
  const match = /^(\d{1,2})(?:\s*[:.]?\s*(\d{2}))?\s*(?:([ap])\.?\s*m?\.?)?$/i.exec(text.trim())
  if (!match) return null

  let hours = Number(match[1])
  const minutes = Number(match[2] ?? 0)
  const suffix = match[3]?.toLowerCase()
  if (minutes > 59) return null

  if (suffix) {
    if (hours < 1 || hours > 12) return null
    hours = (hours % 12) + (suffix === 'p' ? 12 : 0)
  } else if (format === '12h' && hours >= 1 && hours <= 12) {
    return null
  }
  return hours > 23 ? null : `${pad(hours)}:${pad(minutes)}`
}

/** "19:30" → "19:30" or "7:30 PM". */
export function formatTimeText(time: string, format: TimeFormat) {
  if (format === '24h') return time
  const [hours, minutes] = time.split(':').map(Number)
  return `${hours % 12 || 12}:${pad(minutes)} ${hours < 12 ? 'AM' : 'PM'}`
}
