'use client'

import { ExternalLink } from 'lucide-react'
import { timeAgo } from '@/lib/helper'

interface SystemLinkCardProps {
  id: number
  label: string
  url: string
  note: string | null
  removedAt?: Date | string | null
  updatedAt: Date | string
  createdBy: { name: string }
}

/**
 * Renders the system link itself (Name, Link, Open button, Remove status).
 * Panelist comments are now rendered in a separate card below this one.
 */
export function SystemLinkCard({
  link,
}: {
  link: SystemLinkCardProps
}) {
  const removed = Boolean(link.removedAt)

  return (
    <article
      className={[
        'rounded-[14px] border bg-white p-4',
        removed
          ? 'border-[#e5e7f2] bg-[#fafaff] opacity-70'
          : 'border-[#e4e7fb]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={[
                'font-sans text-[14px] font-bold truncate',
                removed ? 'text-[#8a93b4] line-through' : 'text-[#2c3159]',
              ].join(' ')}
            >
              {link.label}
            </h3>
            {removed ? (
              <span className="shrink-0 rounded-full bg-[#eef0f6] px-2 py-[2px] font-sans text-[10.5px] font-bold uppercase tracking-wide text-[#8a93b4]">
                Removed
              </span>
            ) : null}
          </div>
          {link.note ? (
            <p className="mt-1 font-sans text-[12.5px] text-[#5a6382]">
              {link.note}
            </p>
          ) : null}
          <p className="mt-1 font-sans text-[11.5px] text-[#8a93b4]">
            added by {link.createdBy.name} · updated{' '}
            {timeAgo(link.updatedAt)}
          </p>
        </div>

        {removed ? null : (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 h-[30px] px-3 rounded-[9px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] font-sans text-[12.5px] font-bold text-[#707dff] hover:bg-[#eeefff] transition-colors"
          >
            Open
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </article>
  )
}
