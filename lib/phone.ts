// Client-safe phone display helpers. Validation is `normalizePhone` in lib/game-backend.ts.

/** "+994502103456" → "+994 50 210 34 56"; other strings are returned unchanged. */
export function formatPhone(phone: string) {
  const match = /^\+994(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone)
  return match ? `+994 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : phone
}

/** Shown as a fixed prefix in front of phone inputs, which hold only the 9 digits after it. */
export const PHONE_PREFIX = '+994'

/**
 * Formats the part after +994 as the user types: "775386004" → "77 538 60 04". Anything that isn't a
 * digit is dropped, and a pasted "+994 77 …" or "077 …" loses its prefix. Never more than 9 digits.
 */
export function formatLocalPhone(input: string) {
  let digits = input.replace(/\D/g, '')
  // 11+ digits can only be a full number with the country code (a local one has 9).
  if (digits.length > 10 && digits.startsWith('994')) digits = digits.slice(3)
  // No Azerbaijani number starts with 0 after +994; this is the domestic "0" prefix.
  if (digits.startsWith('0')) digits = digits.slice(1)
  digits = digits.slice(0, 9)
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7)].filter(Boolean).join(' ')
}

export const PHONE_PLACEHOLDER = 'XX XXX XX XX'
export const PHONE_ERROR = 'Nömrəni tam daxil edin, məsələn 77 538 60 04.'
