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

      {initialLinks.map((link) => (
        <SystemCommentsCard
          key={link.id}
          linkId={link.id}
          initialComments={comments[link.id] ?? []}
          isPanelist={false}
        />
      ))}
    </div>
  )
}
