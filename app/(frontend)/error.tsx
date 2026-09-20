'use client'

import { useEffect } from 'react'

import { EmptyState } from '@/components/games/EmptyState'
import { buttonClass } from '@/components/ui/button'

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container" style={{ paddingBlock: '96px' }}>
      <EmptyState
        headingLevel="h1"
        title="Nəsə düz getmədi"
        text="Məlumatları yükləmək mümkün olmadı. Bir az sonra yenidən cəhd edin."
        action={
          <button type="button" className={buttonClass('primary', 'md')} onClick={() => retry()}>
            Yenidən cəhd et
          </button>
        }
      />
    </div>
  )
}
