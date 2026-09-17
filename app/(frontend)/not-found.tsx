import Link from 'next/link'

import { EmptyState } from '@/components/games/GamesGrid'
import { buttonClass } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container" style={{ paddingBlock: '96px' }}>
      <EmptyState
        headingLevel="h1"
        title="Səhifə tapılmadı"
        text="Axtardığınız oyun və ya səhifə mövcud deyil, ya da silinib."
        action={
          <Link href="/" className={buttonClass('primary', 'md')}>
            Ana səhifəyə qayıt
          </Link>
        }
      />
    </div>
  )
}
