'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { roleHome, safeNextPath } from '@/lib/helper'
import { LAST_ROUTE_KEY } from '@/components/globals/RouteTracker'

/**
 * Rendered on the login page. When an already-authenticated user lands here
 * (typed /login, clicked a stale link), send them back to the route they were
 * on before — falling back to their role home when there is no remembered
 * route (e.g., opened /login in a fresh tab). Expired sessions never reach
 * this branch: status stays 'unauthenticated' and the form renders normally.
 */
export function RedirectIfAuthed() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  // An explicit resume target (e.g. /join/<code>) wins over last-route.
  const next = safeNextPath(searchParams.get('next'))

  useEffect(() => {
    if (status !== 'authenticated') return

    const last = sessionStorage.getItem(LAST_ROUTE_KEY)
    const target =
      next ??
      (last && last.startsWith('/') && last !== '/login'
        ? last
        : roleHome(session?.user?.role))

    router.replace(target)
  }, [status, session, router, next])

  return null
}
