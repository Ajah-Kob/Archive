'use client'

import { Link2 } from 'lucide-react'
import type { PanelistSystemComment } from './SystemCommentsCard'
import type { PanelistSystemLink } from '@/lib/actions/system-links'
import { SystemLinksCard } from './SystemLinksCard'
import { SystemCommentsCard } from './SystemCommentsCard'

const EMPTY_STATE =
  'No links submitted yet. The group has not added any links for this defense.'

/**
 * Panelist System tab. Renders the System Links card and, for each link,
 * a separate Panelist Comments card below it.
 */
export function SystemTabPanel({
  links,
  commentsByLink,
  currentUserId,
}: {
  links: PanelistSystemLink[]
  commentsByLink: Record<number, PanelistSystemComment[]>
  /** Whose comments get a delete button. */
  currentUserId: number
}) {
  // Withdrawn links sink to the bottom but are never hidden: a panelist should
  // see that feedback was left on something the group took down.
  const ordered = [
    ...links.filter((l) => !l.removedAt),
    ...links.filter((l) => l.removedAt),
  ]

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#dfe3fb] bg-white px-6 py-14 text-center">
        <Link2 className="size-6 text-[#b6bcd6]" />
        <p className="font-sans text-[13.5px] text-[#5a6382]">{EMPTY_STATE}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <SystemLinksCard
        scheduleId={0}
        verdict=""
        defenseLabel=""
        initialLinks={ordered as never}
        editable={false}
      />

      {ordered.map((link) => (
        <SystemCommentsCard
          key={link.id}
          linkId={link.id}
          initialComments={commentsByLink[link.id] ?? []}
          currentUserId={currentUserId}
          isPanelist={true}
        />
      ))}
    </div>
  )
}
