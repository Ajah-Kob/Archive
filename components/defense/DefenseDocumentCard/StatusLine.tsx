import type { ReactNode } from 'react'
import { Clock } from 'lucide-react'

type StatusLineProps = {
  tone: 'amber' | 'muted'
  children: ReactNode
}

/**
 * Status line under document meta — Figma 1471-6082.
 * amber (PENDING): Clock 9px + text #f59e0b 12px medium
 * muted: text #9ea8c6 12px medium
 */
export function StatusLine({ tone, children }: StatusLineProps) {
  return (
    <div className="flex items-center gap-[5px] py-[3px]">
      {tone === 'amber' && (
        <Clock className="size-[9px] text-[#f59e0b]" strokeWidth={2.5} />
      )}
      <p
        className={`font-sans font-medium text-[12px] leading-[18px] whitespace-nowrap ${
          tone === 'amber' ? 'text-[#f59e0b]' : 'text-[#9ea8c6]'
        }`}
      >
        {children}
      </p>
    </div>
  )
}
