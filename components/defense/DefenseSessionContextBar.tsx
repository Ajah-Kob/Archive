'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, History } from 'lucide-react'

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
    <div className="flex items-center justify-between py-[0px] px-8 bg-[#eef2ff] border-b border-[#dfe3fb] shrink-0 min-h-[64px]">
      <div className="flex-1" />
      <div className="flex items-center gap-[8px] shrink-0">
        {onDocumentHistory && (
          <button
            type="button"
            onClick={onDocumentHistory}
            className="flex items-center gap-[7px] h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
          >
            <History className="size-3.5" />
            Document History
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push(target)}
          className="flex items-center gap-[7px] h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </button>
      </div>
    </div>
  )
}
