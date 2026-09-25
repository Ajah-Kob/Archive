import type { ReactNode } from 'react'

/**
 * Single source of truth for timeline geometry.
 *
 * - RAIL wider than DOT so every status dot reads as living inside the rail.
 * - DOT must match the RowIcon tile size in CapstoneJourney (22px).
 * - Alignment uses flex centering + a shared cell width — never absolute
 *   offset math — so changing these numbers cannot break centering.
 */
export const TIMELINE_RAIL_WIDTH_PX = 26
export const TIMELINE_DOT_PX = 22

interface TimelineRowProps {
  first: boolean
  last: boolean
  dot: ReactNode
  children: ReactNode
}

/**
 * One timeline row: rail segment (joints with neighbors into a continuous
 * line, rounded caps on the ends) + centered status dot + card content.
 */
export function TimelineRow({ first, last, dot, children }: TimelineRowProps) {
  return (
    <div className="flex gap-4 py-2 first:pt-0 last:pb-0">
      <span
        className="relative flex shrink-0 self-stretch justify-center"
        style={{ width: TIMELINE_RAIL_WIDTH_PX }}
      >
        <span
          aria-hidden
          className={`absolute inset-y-0 w-full bg-white ring-1 ring-[#e0e3f0] shadow-[0_1px_3px_rgba(30,58,138,0.12)] ${
            first ? 'rounded-t-full' : ''
          } ${last ? 'rounded-b-full' : ''}`}
        />
        <span className="relative z-10 pt-[18px]">{dot}</span>
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
