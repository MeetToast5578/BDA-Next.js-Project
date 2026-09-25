'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLink({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string
  className?: string
  ariaLabel?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  return (
    <Link href={href} className={className} aria-label={ariaLabel} aria-current={pathname === href ? 'page' : undefined}>
      {children}
    </Link>
  )
}
