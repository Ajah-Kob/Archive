'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Mask that dissolves content into the bar background at its right edge, so a
 * scrolled strip fades out instead of being sliced off against a hard border.
 * Black is fully opaque in a mask, so it is the "visible" end of the gradient.
 */
export const RIGHT_EDGE_FADE_MASK =
  '[mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent_100%)]'

/**
 * Reveals `RIGHT_EDGE_FADE_MASK` only while content is actually hidden to the
 * right, and drops it once you reach the end.
 *
 * A permanent mask would dim the final tab on bars that fit, which is most of
 * them on desktop -- so the fade has to be measured rather than assumed.
 */
export function useRightEdgeFade<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [faded, setFaded] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const hidden = el.scrollWidth - el.clientWidth - el.scrollLeft
    setFaded(hidden > 1)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    // Width changes (viewport, sidebar collapse) alter whether it overflows.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [measure])

  return { ref, faded }
}