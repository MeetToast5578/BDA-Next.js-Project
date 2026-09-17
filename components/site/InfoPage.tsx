import styles from './InfoPage.module.css'

export function InfoPage({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <article className={`container ${styles.page}`}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lead}>{lead}</p>
      <div className={styles.body}>{children}</div>
    </article>
  )
}
