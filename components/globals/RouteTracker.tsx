'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { isAuthRoute } from '@/lib/helper'

export const LAST_ROUTE_KEY = 'archive:last-route'

/**
 * Remembers the last resumable app route (per tab, via sessionStorage) so the
 * login page can send already-authenticated visitors back where they came from
 * instead of a generic role home.
 *
 * Two exclusions, deliberately different:
 *   - Auth routes (/login, /signup, /forgot-password, /reset-password) are
 *     entry points, not destinations. Recording one poisons the stored value:
 *     /signup is a single click from /login, so signing in afterwards used to
 *     bounce through /signup before RedirectIfAuthed's own redirect corrected
 *     it a second later.
 *   - '/' is the public landing page, also not resumable — remembering it made
 *     post-login bounce through the landing page (visible flash).
 */
export function RouteTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/' && !isAuthRoute(pathname)) {
      sessionStorage.setItem(LAST_ROUTE_KEY, pathname)
    }
  }, [pathname])

  return null
}

