import type { ReactNode } from 'react'

/**
 * The single source of truth for the auth card's surface: width cap, padding,
 * radius, background and shadow.
 *
 * This string was previously duplicated in five places, which let the copy in
 * `FormResetPassword` drift (nested inside another card, doubling the padding
 * and shadow) and the copy in `AuthCardSkeleton` drift (an input height that
 * didn't match the real `AuthInput`). Point new auth surfaces here rather than
 * re-typing it.
 */
const CARD_SURFACE =
  'w-full p-6 md:p-8 rounded-3xl bg-[#ffffff] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.03),0px_20px_60px_-4px_rgba(112,125,255,0.16),0px_0px_0px_1px_rgba(112,125,255,0.06)] flex flex-col gap-5 relative z-10'

export function AuthCardFrame({
  children,
  className = '',
}: {
  children: ReactNode
  /** Extra classes for the surface itself, e.g. `animate-pulse` on a skeleton. */
  className?: string
}) {
  return <div className={`${CARD_SURFACE} ${className}`}>{children}</div>
}
