 import styles from './Auth.module.css'

function GoogleIcon() {
  // Google "G" mark (the flat-color-icons:google glyph used in the design).
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

export function AuthShell({
  eyebrow,
  title,
  description,
  googleHref,
  children,
}: {
  eyebrow?: string
  title: string
  description: string
  /** Omitted when Google sign-in isn't configured. */
  googleHref?: string
  /** Omitted for Google-only pages (no divider or form card is rendered). */
  children?: React.ReactNode
}) {
  return (
    <section className={styles.shell} aria-labelledby="auth-title">
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.container}>
        <div className={styles.head}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h1 id="auth-title" className={styles.title}>
            {title}
          </h1>
          <p className={styles.description}>{description}</p>
        </div>

        {googleHref && (
          <>
            {/* A plain link: the OAuth flow is a full-page redirect. */}
            <a href={googleHref} className={styles.google}>
              <GoogleIcon />
              Google ilə davam et
            </a>
            {children && <p className={styles.divider}>və ya</p>}
          </>
        )}

        {children && <div className={styles.card}>{children}</div>}
      </div>
    </section>
  )
}
