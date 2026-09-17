'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'

import { ApiError, postJson } from '@/lib/api-client'
import { buttonClass } from '@/components/ui/button'
import form from '@/components/ui/form.module.css'
import styles from './Auth.module.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

type Field = 'firstName' | 'lastName' | 'email' | 'password' | 'confirm'
type Values = Record<Field, string>

function validate(values: Values) {
  const errors: Partial<Values> = {}
  if (!values.firstName.trim()) errors.firstName = 'Adınızı daxil edin.'
  if (!values.lastName.trim()) errors.lastName = 'Soyadınızı daxil edin.'
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Düzgün email ünvanı daxil edin.'
  if (values.password.length < MIN_PASSWORD_LENGTH) errors.password = `Şifrə minimum ${MIN_PASSWORD_LENGTH} simvol olmalıdır.`
  if (values.confirm !== values.password) errors.confirm = 'Şifrələr eyni deyil.'
  return errors
}

/** "Qeydiyyat": `POST /api/users`, then signs in with the same credentials. */
export function RegisterForm({ next }: { next: string }) {
  const router = useRouter()
  const id = useId()
  const [values, setValues] = useState<Values>({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<Values>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const loginHref = next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`

  const update = (field: Field) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const formElement = event.currentTarget
      requestAnimationFrame(() => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    const email = values.email.trim()
    const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`
    setPending(true)
    try {
      await postJson('/api/users', { email, password: values.password, fullName })
    } catch (err) {
      setPending(false)
      if (err instanceof ApiError && err.fields.email) {
        setErrors({ email: 'Bu email ilə artıq hesab mövcuddur.' })
      } else {
        setFormError(err instanceof Error ? err.message : 'Qeydiyyat mümkün olmadı.')
      }
      return
    }

    try {
      await postJson('/api/users/login', { email, password: values.password })
      router.replace(next)
      router.refresh()
    } catch {
      // The account exists; only the automatic sign-in failed.
      router.replace(loginHref)
    }
  }

  const field = (name: Field, label: string, input: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className={form.field}>
      <label htmlFor={`${id}-${name}`} className={form.label}>
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        className={`${form.input} ${form.inputLarge}`}
        value={values[name]}
        onChange={update(name)}
        required
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
        {...input}
      />
      {errors[name] && (
        <p id={`${id}-${name}-error`} className={form.fieldError}>
          {errors[name]}
        </p>
      )}
    </div>
  )

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h2 className="visually-hidden">Qeydiyyat forması</h2>
      <div className={form.row}>
        {field('firstName', 'Ad', { autoComplete: 'given-name', placeholder: 'Adınız' })}
        {field('lastName', 'Soyad', { autoComplete: 'family-name', placeholder: 'Soyadınız' })}
      </div>
      {field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'ad@nümunə.com' })}
      {field('password', 'Şifrə', {
        type: 'password',
        autoComplete: 'new-password',
        placeholder: `Minimum ${MIN_PASSWORD_LENGTH} simvol`,
        minLength: MIN_PASSWORD_LENGTH,
      })}
      {field('confirm', 'Şifrə (təkrar)', {
        type: 'password',
        autoComplete: 'new-password',
        placeholder: 'Şifrəni təkrar daxil edin',
      })}

      {formError && (
        <p className={form.alert} role="alert">
          {formError}
        </p>
      )}

      <button
        type="submit"
        className={buttonClass('primary', 'lg', { block: true })}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? 'Hesab yaradılır…' : 'Qeydiyyatdan keç'}
      </button>

      <p className={styles.links} style={{ justifyContent: 'center' }}>
        <span>
          Artıq hesabınız var?{' '}
          <Link href={loginHref} className={styles.inlineLink}>
            Daxil ol
          </Link>
        </span>
      </p>
    </form>
  )
}
