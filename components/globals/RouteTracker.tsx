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
    if (pathname !== '/login') {
      sessionStorage.setItem(LAST_ROUTE_KEY, pathname)
    }
  }, [pathname])

  return null
}
