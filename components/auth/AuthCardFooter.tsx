'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { safeNextPath } from '@/lib/helper'

// Below-card link for the login/signup cards. Same styling as the
// forgot/reset page links. Preserves the invite `?next=` resume param.
export function AuthCardFooter({
  text,
  linkLabel,
  href,
}: {
  text: string
  linkLabel: string
  href: string
}) {
  const searchParams = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))

  return (
    <div className="mt-2 text-center text-sm text-slate-500 font-medium">
      {text}{' '}
      <Link
        href={next ? `${href}?next=${encodeURIComponent(next)}` : href}
        className="font-medium text-indigo-400 hover:text-indigo-500 transition-colors"
      >
        {linkLabel}
      </Link>
    </div>
  )
}
