'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export const LAST_ROUTE_KEY = 'archive:last-route'

/**
 * Remembers the last non-login route (per tab, via sessionStorage) so the
 * login page can send already-authenticated visitors back where they came
 * from instead of a generic role home.
 */
export function RouteTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // The public landing page is an entry point, not a resumable app route —
    // remembering it makes post-login bounce through `/` (visible flash).
    if (pathname !== '/login' && pathname !== '/') {
      sessionStorage.setItem(LAST_ROUTE_KEY, pathname)
    }
  }, [pathname])

  return null
}
