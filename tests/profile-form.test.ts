import { describe, expect, it } from 'vitest'

import { NAME_ERROR, profilePatch, validateProfileDraft } from '@/lib/profile-form'
import { PHONE_ERROR } from '@/lib/phone'

const saved = { fullName: 'Kərim Məmmədov', phoneNumber: '+994502103456' }

describe('validateProfileDraft', () => {
  it('accepts a name with a whole number, or no number at all', () => {
    expect(validateProfileDraft({ fullName: 'Kərim Məmmədov', phone: '50 210 34 56' })).toEqual({})
    expect(validateProfileDraft({ fullName: 'Kərim', phone: '' })).toEqual({})
  })

  it('wants a name, of at most 120 characters', () => {
    expect(validateProfileDraft({ fullName: '   ', phone: '' })).toEqual({ fullName: NAME_ERROR })
    expect(validateProfileDraft({ fullName: 'a'.repeat(121), phone: '' }).fullName).toMatch(/120/)
  })

  it('refuses a half-typed number', () => {
    expect(validateProfileDraft({ fullName: 'Kərim', phone: '50 210' })).toEqual({ phone: PHONE_ERROR })
  })
})

describe('profilePatch', () => {
  it('is empty when nothing changed, including surrounding spaces', () => {
    expect(profilePatch(saved, { fullName: ' Kərim Məmmədov ', phone: '50 210 34 56' })).toEqual({})
  })

  it('sends only the fields that changed', () => {
    expect(profilePatch(saved, { fullName: 'Kərim M.', phone: '50 210 34 56' })).toEqual({ fullName: 'Kərim M.' })
    expect(profilePatch(saved, { fullName: 'Kərim Məmmədov', phone: '55 987 65 43' })).toEqual({
      phone: '+994559876543',
    })
  })

  it('clears the number with null when the field is emptied', () => {
    expect(profilePatch(saved, { fullName: 'Kərim Məmmədov', phone: '' })).toEqual({ phone: null })
  })

  it('adds a number to a profile that had none, and leaves "none" alone', () => {
    const noPhone = { ...saved, phoneNumber: null }
    expect(profilePatch(noPhone, { fullName: saved.fullName, phone: '77 538 60 04' })).toEqual({ phone: '+994775386004' })
    expect(profilePatch(noPhone, { fullName: saved.fullName, phone: '' })).toEqual({})
  })
})
