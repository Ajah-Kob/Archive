'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * Settles the session (fresh JWT with the new role from the DB) before
 * navigating. A plain server redirect would race the stale GUEST token and
 * proxy.ts would bounce the user back to /guest.
 */
export function JoinRedirect({ to }: { to: string }) {
  const router = useRouter()
  const { update } = useSession()

  useEffect(() => {
    let cancelled = false
    update()
      .catch(() => null)
      .finally(() => {
        if (!cancelled) router.replace(to)
      })
    return () => {
      cancelled = true
    }
  }, [router, to, update])

  return (
    <div className="bg-[#f4f6ff] min-h-dvh flex flex-col items-center justify-center px-5 py-16">
      <div className="size-8 border-[3px] border-[#707dff]/30 border-t-[#707dff] rounded-full animate-spin" />
      <p className="mt-4 font-sans font-medium text-[13px] text-[#8a93b4]">
        Joining, taking you to your workspace…
      </p>
    </div>
  )
}
