'use client'

import { CalendarClock } from 'lucide-react'
import type { DefenseType } from '@prisma/client'

interface DefenseEmptyStateProps {
  /** Which defense type this milestone represents (Proposal or Final). */
  type: DefenseType
}

/**
 * Empty state for a defense milestone whose group has not been scheduled yet.
 * Renders only the empty illustration so the page never 404s and does not
 * show a Verdict Callout when no DefenseSchedule exists.
 */
export function DefenseEmptyState({ type }: DefenseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-[10px] rounded-[14px] border border-[#e0e3f0] bg-[#f8f9ff] px-[24px] py-[40px] text-center">
        <div className="flex size-[48px] items-center justify-center rounded-full bg-[#eef0fb]">
          <CalendarClock className="size-[20px] text-[#707dff]" strokeWidth={2} />
        </div>
        <p className="font-sora text-[14px] font-semibold text-[#1e3a8a]">
          No defense scheduled yet
        </p>
        <p className="max-w-[420px] text-[12.5px] leading-[18.75px] text-[#5a6382]">
          Your coordinator has not scheduled a defense for your group yet. Once
          a schedule is set, you will be able to upload your defense document
          and track the verdict here.
        </p>
      </div>
  )
}
