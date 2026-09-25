import type { InputHTMLAttributes } from 'react'

import { formatLocalPhone, PHONE_PLACEHOLDER, PHONE_PREFIX } from '@/lib/phone'
import form from './form.module.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  id: string
  /** Only the digits after +994, as `formatLocalPhone` groups them: "77 538 60 04". */
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  /** Ids of the hint and error under the field; the prefix is always described. */
  describedBy?: string
  compact?: boolean
}

/**
 * A phone field with a fixed "+994" in front, holding only the nine local digits and grouping them
 * as they are typed. The label and error message stay with the caller, next to its other fields.
 */
export function PhoneInput({ id, value, onChange, invalid, describedBy, compact = false, ...rest }: Props) {
  const prefixId = `${id}-prefix`
  return (
    <div className={form.inputWrap}>
      <span id={prefixId} className={form.prefix}>
        {PHONE_PREFIX}
      </span>
      {/* No maxLength: it would cut a pasted "+994 77 538 60 04" before formatLocalPhone sees it. */}
      <input
        {...rest}
        id={id}
        className={[form.input, compact && form.inputCompact, form.withPrefix].filter(Boolean).join(' ')}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={PHONE_PLACEHOLDER}
        value={value}
        onChange={(event) => onChange(formatLocalPhone(event.target.value))}
        aria-invalid={invalid || undefined}
        aria-describedby={[prefixId, describedBy].filter(Boolean).join(' ')}
      />
    </div>
  )
}
