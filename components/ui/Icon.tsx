import Image from 'next/image'

// Icons exported from the Figma file, at their designed sizes.
const ICONS = {
  pin: { src: '/icons/pin.svg', width: 10.5, height: 13.97 },
  calendar: { src: '/icons/calendar.svg', width: 12.25, height: 14 },
  clock: { src: '/icons/clock.svg', width: 14, height: 14 },
  arrowRight: { src: '/icons/arrow-right.svg', width: 16, height: 16 },
  chevron: { src: '/icons/chevron.svg', width: 14.17, height: 23 },
  close: { src: '/icons/x-circle.svg', width: 14, height: 14 },
} as const

export type IconName = keyof typeof ICONS

/**
 * Decorative icon; the surrounding text carries the meaning. The box has the exact (often fractional)
 * Figma size and the SVG fills it, since next/image's width/height attributes must be integers.
 */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  const { src, width, height } = ICONS[name]
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ position: 'relative', display: 'inline-block', width, height, flexShrink: 0 }}
    >
      <Image src={src} alt="" fill sizes={`${Math.ceil(width)}px`} unoptimized />
    </span>
  )
}
