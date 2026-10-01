'use client'

import { RIGHT_EDGE_FADE_MASK, useRightEdgeFade } from '@/lib/hooks/useRightEdgeFade'

interface ScrollFadeRegionProps {
  children: React.ReactNode
  /** Layout classes for the strip — it always scrolls in x with no visible bar. */
  className?: string
}

/**
 * A horizontally scrollable strip that dissolves into the bar background at its
 * right edge, but only while content is actually hidden there. Replaces a hard
 * cut-off when a tab strip or toolbar runs past the available width.
 */
export function ScrollFadeRegion({ children, className = '' }: ScrollFadeRegionProps) {
  const { ref, faded } = useRightEdgeFade<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={`min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${faded ? RIGHT_EDGE_FADE_MASK : ''} ${className}`}
    >
      {children}
    </div>
  )
}