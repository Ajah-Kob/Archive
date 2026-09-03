import type { ReactNode } from 'react'

type LatestDocumentCardBodyProps = {
  children: ReactNode
  className?: string
}

/**
 * Shared shell body — Figma 1471-5962 spacing p-14 gap-14.
 * Provides the padded container for timeline rows + actions.
 */
export function LatestDocumentCardBody({
  children,
  className,
}: LatestDocumentCardBodyProps) {
  return (
    <div
      className={[
        'p-[14px] flex flex-col gap-[14px]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
