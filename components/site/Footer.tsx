import Link from 'next/link'

import styles from './Footer.module.css'

const LINKS = [
  { href: '/about', label: 'Haqqımızda' },
  { href: '/rules', label: 'Qaydalar' },
  { href: '/privacy', label: 'Məxfilik' },
  { href: '/contact', label: 'Əlaqə' },
]

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              OyunaGəl
            </Link>
            <p className={styles.tagline}>Azərbaycanın ən böyük idman koordinasiya platforması. Birlikdə oynayaq.</p>
          </div>
          <nav aria-label="Footer">
            <ul className={styles.links}>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={styles.link}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className={styles.bottom}>
          <p className={styles.copyright}>© {new Date().getFullYear()} OyunaGəl. Bütün hüquqlar qorunur.</p>
        </div>
      </div>
    </footer>
  )
}
