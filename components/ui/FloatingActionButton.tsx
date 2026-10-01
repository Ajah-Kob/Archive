'use client'

import type { ReactNode } from 'react'

interface FloatingActionButtonProps {
  /** Icon only — the control has no text, so `label` is the accessible name. */
  icon: ReactNode
  /** Required. Becomes both `aria-label` and the desktop tooltip. */
  label: string
  onClick: () => void
  className?: string
}

/**
 * The mobile stand-in for a page's primary action, which otherwise sits in the
 * header bar. Below `sm` the bar button is hidden and this takes over, so the
 * two never appear together and the bar's scroll strip gets the reclaimed width.
 *
 * z-40 sits above the sticky bar (z-30) and below the modal overlays (z-60), so
 * an open dialog dims the button and stops it being tappable rather than leaving
 * it floating over the backdrop.
 */
export function FloatingActionButton({
  icon,
  label,
  onClick,
  className = '',
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`sm:hidden fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#707dff] text-white shadow-[0_4px_14px_rgba(112,125,255,0.4)] transition-[transform,background-color] active:scale-95 hover:bg-[#5565ff] cursor-pointer bottom-[calc(1rem+env(safe-area-inset-bottom))] ${className}`}
    >
      {icon}
    </button>
  )
}
