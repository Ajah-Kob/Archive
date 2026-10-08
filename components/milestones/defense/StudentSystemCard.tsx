'use client'

import { useState } from 'react'
import { linksAreEditable } from '@/lib/system-links'
import type { StudentSystemLink } from '@/lib/actions/system-links'
import type { PanelistSystemComment } from '@/components/defense/system/SystemCommentsCard'
import { SystemLinksCard } from '@/components/defense/system/SystemLinksCard'
import { SystemCommentsCard } from '@/components/defense/system/SystemCommentsCard'

/**
 * Student System tab — renders the System Links card and, for each link,
 * a separate Panelist Comments card below it.
 *
 * Links and comments are server-fetched and passed as initial props, so the
 * student sees everything immediately on tab open with no loading flash.
 */
export function StudentSystemCard({
  scheduleId,
  verdict,
  defenseLabel,
  initialLinks,
  initialCommentsByLink,
}: {
  scheduleId: number
  verdict: string
  defenseLabel: string
  initialLinks: StudentSystemLink[]
  initialCommentsByLink: Record<number, PanelistSystemComment[]>
}) {
  const [comments] =
    useState<Record<number, PanelistSystemComment[]>>(initialCommentsByLink)

  return (
    <div className="flex flex-col gap-5">
      <SystemLinksCard
        scheduleId={scheduleId}
        verdict={verdict}
        defenseLabel={defenseLabel}
        initialLinks={initialLinks}
        editable={linksAreEditable(verdict)}
      />

      {verdict === 'PENDING' ? null : initialLinks.length === 0 ? (
        <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="border-[#f0f2fa] border-b w-full shrink-0">
            <div className="flex items-center px-[18px] pt-[15px] pb-[16px] w-full">
              <p className="font-['Sora',sans-serif] font-bold text-[12.5px] leading-[normal] tracking-[-0.125px] text-[#1e3a8a]">
                Panelist Comments
              </p>
            </div>
          </div>
          <div className="p-4">
            <p className="font-sans text-[12.5px] text-[#8a93b4]">
              No links yet. Add a link to see panelist comments.
            </p>
          </div>
        </div>
      ) : (
        initialLinks.map((link) => (
          <SystemCommentsCard
            key={link.id}
            linkId={link.id}
            initialComments={comments[link.id] ?? []}
            isPanelist={false}
          />
        ))
      )}
    </div>
  )
}
