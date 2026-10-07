'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import type { PanelistSystemComment } from './SystemLinkCard'
import type { PanelistSystemLink } from '@/lib/actions/system-links'
import { SystemLinkCard } from './SystemLinkCard'

const EMPTY_STATE =
  'No links submitted yet. The group has not added any links for this defense.'

/**
 * Panelist System tab. Read-only on the links themselves -- panelists discuss
 * what was built, the group maintains the list -- so there is no add/edit/remove
 * affordance here by design.
 */
export function SystemTabPanel({
  links,
  commentsByLink,
}: {
  links: PanelistSystemLink[]
  commentsByLink: Record<number, PanelistSystemComment[]>
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
    <div className="flex flex-col gap-4">
      <p className="font-sans text-[12.5px] text-[#5a6382]">
        Links the group submitted for this defense. Open a link in a new tab,
        then leave comments on what to revise or add.
      </p>
      <div className="flex flex-col gap-3">
        {ordered.map((link) => (
          <SystemLinkCard
            key={link.id}
            link={link}
            comments={commentsByLink[link.id] ?? []}
          />
        ))}
      </div>
    </div>
  )
}