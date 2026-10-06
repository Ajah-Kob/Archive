'use client'

import { useSyncExternalStore } from 'react'

/**
 * Matches a CSS media query, staying subscribed to changes.
 *
 * `useSyncExternalStore` rather than the usual
 * `useState(false)` + `useEffect(() => setState(query.matches))`, because that
 * pattern trips the setState-in-effect lint rule and needs a third argument to
 * stay SSR-safe. The third argument here is the server snapshot, so
 * `window` is never touched during render on the server.
 *
 * Subscribed rather than read once, so rotating a phone or resizing a desktop
 * window updates the answer instead of freezing on whatever was true at mount.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    () => false,
  )
}

/** Tailwind's `sm` boundary, as a media query. */
export const SM_DOWN_QUERY = '(max-width: 639px)'

/**
 * True below the `sm` breakpoint.
 *
 * Used where a control is pointless on a phone — the hand and select toolbar
 * buttons, which are gestures rather than modes there.
 */
export function useIsTouchViewport(): boolean {
  return useMediaQuery(SM_DOWN_QUERY)
}