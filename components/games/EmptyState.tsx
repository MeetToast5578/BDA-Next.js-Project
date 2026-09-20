import styles from './GamesGrid.module.css'

export function EmptyState({
  title,
  text,
  action,
  headingLevel = 'h3',
}: {
  title: string
  text: string
  action?: React.ReactNode
  headingLevel?: 'h1' | 'h2' | 'h3'
}) {
  const Heading = headingLevel
  return (
    <div className={styles.empty}>
      <EmptyIllustration />
      <Heading className={styles.emptyTitle}>{title}</Heading>
      <p className={styles.emptyText}>{text}</p>
      {action}
    </div>
  )
}

/** Empty-state illustration: a ball on an empty pitch, drawn in the brand colors. */
function EmptyIllustration() {
  return (
    <svg className={styles.emptyImage} viewBox="0 0 320 200" role="img" aria-label="Boş meydança" focusable="false">
      <rect x="8" y="16" width="304" height="168" rx="16" fill="var(--color-primary-soft)" />
      <g fill="none" stroke="var(--color-primary-border)" strokeWidth="2">
        <rect x="24" y="32" width="272" height="136" rx="8" />
        <line x1="160" y1="32" x2="160" y2="168" />
        <circle cx="160" cy="100" r="30" />
        <path d="M24 72h28v56H24M296 72h-28v56h28" />
      </g>
      <circle cx="160" cy="100" r="17" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="2" />
      <path
        d="m160 89 8 5.8-3 9.4h-10l-3-9.4z"
        fill="var(--color-primary)"
      />
    </svg>
  )
}
