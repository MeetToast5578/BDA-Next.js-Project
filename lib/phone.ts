// Client-safe phone display helpers. Validation is `normalizePhone` in lib/game-backend.ts.

/** "+994502103456" → "+994 50 210 34 56"; other strings are returned unchanged. */
export function formatPhone(phone: string) {
  const match = /^\+994(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone)
  return match ? `+994 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : phone
}

export const PHONE_PLACEHOLDER = '+994 XX XXX XX XX'
export const PHONE_ERROR = 'Telefon nömrəsini +994 50 210 34 56 formatında daxil edin.'
