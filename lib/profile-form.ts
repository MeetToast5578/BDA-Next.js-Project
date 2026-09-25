// "Profili redaktə et" form logic, kept out of the component so it can be tested. Client-safe.

import type { ProfileUpdateRequest } from '@/lib/api-types'
import { MAX_FULL_NAME_LENGTH, normalizePhone } from '@/lib/game-backend'
import { PHONE_ERROR, PHONE_PREFIX } from '@/lib/phone'

/** What the form holds: the name as typed, and the phone's nine local digits as `PhoneInput` groups them. */
export type ProfileDraft = { fullName: string; phone: string }
export type ProfileField = keyof ProfileDraft
export type ProfileFormErrors = Partial<Record<ProfileField, string>>

export const NAME_ERROR = 'Ad və soyadınızı daxil edin.'

/** The same rules as `parseProfileUpdate` on the server, checked before anything is sent. */
export function validateProfileDraft(draft: ProfileDraft): ProfileFormErrors {
  const errors: ProfileFormErrors = {}
  const fullName = draft.fullName.trim()
  if (!fullName) errors.fullName = NAME_ERROR
  else if (fullName.length > MAX_FULL_NAME_LENGTH) {
    errors.fullName = `Ad və soyad ${MAX_FULL_NAME_LENGTH} simvoldan uzun ola bilməz.`
  }
  // The phone is optional: empty is allowed and clears it; anything typed must be a whole number.
  if (draft.phone.trim() && !normalizePhone(`${PHONE_PREFIX}${draft.phone}`)) errors.phone = PHONE_ERROR
  return errors
}

/**
 * The `PATCH /api/v1/me` body for a valid draft: only the fields that differ from what is saved,
 * because the endpoint leaves unsent fields alone. An emptied phone is sent as `null`, which clears
 * it. Empty when nothing changed.
 */
export function profilePatch(
  saved: { fullName: string; phoneNumber: string | null },
  draft: ProfileDraft,
): ProfileUpdateRequest {
  const patch: ProfileUpdateRequest = {}
  const fullName = draft.fullName.trim()
  if (fullName !== saved.fullName) patch.fullName = fullName
  const phone = draft.phone.trim() ? normalizePhone(`${PHONE_PREFIX}${draft.phone}`) : null
  if (phone !== (saved.phoneNumber ?? null)) patch.phone = phone
  return patch
}

/**
 * Where the number in a create or join form stands next to the profile's, for the note under it:
 * - `profile`: it is the profile's number;
 * - `will-save`: the profile has none, so the one used will be kept there;
 * - `differs`: a complete number other than the profile's, which is saved over it only on request;
 * - `none`: nothing to say yet (a number still being typed).
 */
export type PhoneSource = 'profile' | 'will-save' | 'differs' | 'none'

export function phoneSource(profilePhone: string | null, localDigits: string): PhoneSource {
  if (!profilePhone) return 'will-save'
  const phone = normalizePhone(`${PHONE_PREFIX}${localDigits}`)
  if (!phone) return 'none'
  return phone === profilePhone ? 'profile' : 'differs'
}
