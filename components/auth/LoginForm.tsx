'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'

import { ApiError, postJson } from '@/lib/api-client'
import { buttonClass } from '@/components/ui/button'
import form from '@/components/ui/form.module.css'
import styles from './Auth.module.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function loginErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'Daxil olmaq mümkün olmadı.'
  // Payload also answers 401 for an account locked after too many failed attempts (collections/Users.ts).
  if (error.status === 429 || /locked/i.test(error.message)) {
    return 'Çox sayda uğursuz cəhd oldu. 10 dəqiqə sonra yenidən cəhd edin.'
  }
  // Deliberately doesn't say which one is wrong, or whether the account exists.
  if (error.status === 401) return 'Email və ya şifrə yanlışdır. Hesabınız yoxdursa, qeydiyyatdan keçin.'
  return error.message
}

/** "Daxil ol" via `POST /api/users/login`, plus "Şifrəni unutmusunuz?" via `POST /api/users/forgot-password`. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const id = useId()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const registerHref = next === '/' ? '/register' : `/register?next=${encodeURIComponent(next)}`

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Düzgün email ünvanı daxil edin.')
      return
    }
    if (mode === 'login' && !password) {
      setError('Şifrənizi daxil edin.')
      return
    }

    setPending(true)
    try {
      if (mode === 'login') {
        await postJson('/api/users/login', { email: email.trim(), password })
        router.replace(next)
        router.refresh()
        return
      }
      await postJson('/api/users/forgot-password', { email: email.trim() })
      setNotice('Bu email ilə hesab varsa, şifrəni yeniləmək üçün link göndərildi.')
    } catch (err) {
      setError(mode === 'login' ? loginErrorMessage(err) : 'Sorğunu göndərmək mümkün olmadı. Yenidən cəhd edin.')
    }
    setPending(false)
  }

  function switchMode(nextMode: 'login' | 'forgot') {
    setMode(nextMode)
    setError(null)
    setNotice(null)
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h2 className="visually-hidden">{mode === 'login' ? 'Email ilə daxil ol' : 'Şifrəni bərpa et'}</h2>

      <div className={form.field}>
        <label htmlFor={`${id}-email`} className={form.label}>
          Email
        </label>
        <input
          id={`${id}-email`}
          className={`${form.input} ${form.inputLarge}`}
          type="email"
          autoComplete="email"
          placeholder="ad@nümunə.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      {mode === 'login' && (
        <div className={form.field}>
          <label htmlFor={`${id}-password`} className={form.label}>
            Şifrə
          </label>
          <input
            id={`${id}-password`}
            className={`${form.input} ${form.inputLarge}`}
            type="password"
            autoComplete="current-password"
            placeholder="Şifrənizi daxil edin"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
      )}

      {error && (
        <p className={form.alert} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={form.notice} role="status">
          {notice}
        </p>
      )}

      <button
        type="submit"
        className={buttonClass('primary', 'lg', { block: true })}
        disabled={pending}
        aria-busy={pending}
      >
        {mode === 'login' ? (pending ? 'Daxil olunur…' : 'Daxil ol') : pending ? 'Göndərilir…' : 'Bərpa linki göndər'}
      </button>

      <div className={styles.links}>
        {mode === 'login' ? (
          <button type="button" className={styles.linkButton} onClick={() => switchMode('forgot')}>
            Şifrəni unutmusunuz?
          </button>
        ) : (
          <button type="button" className={styles.linkButton} onClick={() => switchMode('login')}>
            ← Daxil olmağa qayıt
          </button>
        )}
        <span>
          Hesabınız yoxdur?{' '}
          <Link href={registerHref} className={styles.inlineLink}>
            Qeydiyyat
          </Link>
        </span>
      </div>
    </form>
  )
}
