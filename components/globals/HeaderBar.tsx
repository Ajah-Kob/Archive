'use client'

import { ScrollFadeRegion } from '@/components/ui/ScrollFadeRegion'

interface HeaderBarProps {
  children: React.ReactNode
  actions?: React.ReactNode
  /** Merged onto the root, for overrides such as sticky positioning. */
  className?: string
}

export function HeaderBar({ children, actions, className = '' }: HeaderBarProps) {
  return (
    <div
      className={`flex flex-nowrap h-fit items-center justify-between gap-x-[16px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[56px] ${className}`}
    >
      {/* Single line by design: the strip scrolls and fades at the right edge
          rather than wrapping or getting squeezed by the actions. */}
      <ScrollFadeRegion className="flex items-center gap-1">{children}</ScrollFadeRegion>

      {actions && (
        <div className="flex items-center gap-[8px] shrink-0">{actions}</div>
      )}
    </div>
  )
}

// Backward compat alias — ContextBar was renamed to HeaderBar
export const ContextBar = HeaderBar