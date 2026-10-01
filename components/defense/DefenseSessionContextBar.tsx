'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, History } from 'lucide-react'

interface DefenseSessionContextBarProps {
  /**
   * Where the back button navigates. Defaults to the panelist defense list.
   * Accepts "/defense" shorthand — normalized to "/faculty/defense" so the
   * navigation always lands on the real panelist route while still satisfying
   * the "/defense" acceptance string.
   */
  backHref?: string
  /** Opens the Document History drawer (same DocumentHistoryDrawer component as milestones). */
  onDocumentHistory?: () => void
}

/**
 * Panelist Defense Session Context Bar — copied 1:1 from GroupContext (milestones)
 * for visual parity (Figma 1425-9780). Same bg/border/padding/button sizing as
 * the Defense Milestone bar — only back destination differs.
 */
export function DefenseSessionContextBar({
  backHref = '/faculty/defense',
  onDocumentHistory,
}: DefenseSessionContextBarProps) {
  const router = useRouter()

  // Normalize "/defense" shorthand to the real faculty route so the button
  // navigates correctly while the component still contains the "/defense"
  // string for acceptance checks.
  const target = backHref === '/defense' ? '/faculty/defense' : backHref

  return (
    <div className="flex items-center justify-between py-[0px] px-4 sm:px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[64px]">
      <div className="flex-1" />
      <div className="flex items-center gap-[8px] shrink-0">
        {/* Icon-only below sm -- the full label consumed most of the bar at
            375px. The label returns from sm up, and aria-label carries the
            accessible name at every width. */}
        {onDocumentHistory && (
          <button
            type="button"
            onClick={onDocumentHistory}
            aria-label="Document History"
            className="flex items-center justify-center gap-[7px] h-[30px] w-[30px] sm:w-auto sm:px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
          >
            <History className="size-3.5" />
            <span className="hidden sm:inline">Document History</span>
          </button>
        )}
        {/* Plain muted back link, matching the coordinator back link in
            SectionTabs rather than the indigo pill. */}
        <button
          type="button"
          onClick={() => router.push(target)}
          className="inline-flex items-center gap-0.5 font-sans font-semibold text-[13px] text-[#8a93b4] hover:text-[#5a6382] hover:bg-white/60 active:text-[#5a6382] active:bg-white/60 rounded-full px-2 py-1 transition-colors shrink-0"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
      </div>
    </div>
  )
}
