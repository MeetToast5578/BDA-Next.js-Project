'use client'

import Image from 'next/image'
import { useState } from 'react'

/** Game cover that swaps to the sport's default image if the uploaded one fails to load. */
export function CoverImage({
  src,
  fallbackSrc,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string
  fallbackSrc: string
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const current = failedSrc === src ? fallbackSrc : src

  return (
    <Image
      src={current}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      style={{ objectFit: 'cover' }}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => {
        if (current !== fallbackSrc) setFailedSrc(src)
      }}
    />
  )
}
