'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

// Fires a one-time success toast when landing with ?joined=1 (e.g. after a
// one-click /join/[code]), then strips the param so refresh stays quiet.
export function JoinedToast({ message }: { message: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current || searchParams.get('joined') !== '1') return
    fired.current = true
    toast.success(message)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('joined')
    const qs = params.toString()
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [searchParams, router, message])

  return null
}
