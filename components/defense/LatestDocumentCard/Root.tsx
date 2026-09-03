import type { ReactNode } from 'react'

type LatestDocumentCardRootProps = {
  children: ReactNode
  className?: string
}

/**
 * Shared shell frame — Figma 1471-5962.
 * bg white, border #e8ebf8, rounded 14px, shadow 0px_2px_12px rgba(30,58,138,0.06).
 * Composition-first: wraps Header + Body.
 */
export function LatestDocumentCardRoot({
  children,
  className,
}: LatestDocumentCardRootProps) {
  return (
    <div
      className={[
        'bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
