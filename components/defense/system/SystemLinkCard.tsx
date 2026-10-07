'use client'

import { useState } from 'react'
import { ExternalLink, MessageSquare } from 'lucide-react'
import { getInitials, timeAgo } from '@/lib/helper'
import type { PanelistSystemLink } from '@/lib/actions/system-links'
import { SystemCommentComposer } from './SystemCommentComposer'

// Dates arrive as Date objects inside the server action and as strings once they
// cross to the client, so both are accepted. timeAgo handles either.
export interface PanelistSystemComment {
  id: number
  body: string
  createdAt: Date | string
  author: { name: string }
  replies: Array<{
    id: number
    body: string
    createdAt: Date | string
    author: { name: string }
  }>
}

/**
 * One link plus the discussion on it.
 *
 * Threads render expanded, not collapsed behind a count. With no resolve state
 * the discussion is the only record of what was raised, and the student reads
 * the same record from the other side — collapsing would work against that.
 */
export function SystemLinkCard({
  link,
  comments,
}: {
  link: PanelistSystemLink
  comments: PanelistSystemComment[]
}) {
  // Withdrawn by the group after a panelist commented. Kept visible because the
  // thread is evidence; the link itself is not clickable.
  const removed = Boolean(link.removedAt)
  const [showComposer, setShowComposer] = useState(false)

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

      <div className="mt-3 flex flex-col gap-2 border-t border-[#eef0f8] pt-3">
        {comments.length === 0 ? (
          <p className="font-sans text-[12.5px] text-[#8a93b4]">
            No comments yet.
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="rounded-[10px] bg-[#f7f8ff] border border-[#eef0f8] p-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#707dff] font-sans text-[9.5px] font-bold text-white">
                  {getInitials(c.author.name)}
                </span>
                <span className="font-sans text-[12px] font-bold text-[#2c3159]">
                  {c.author.name}
                </span>
                <span className="font-sans text-[11px] text-[#8a93b4]">
                  {timeAgo(c.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-[#3d4468]">
                {c.body}
              </p>

              {c.replies.length > 0 ? (
                <div className="mt-2 flex flex-col gap-2 border-l-2 border-[#dfe3fb] pl-3">
                  {c.replies.map((r) => (
                    <div key={r.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[12px] font-bold text-[#2c3159]">
                          {r.author.name}
                        </span>
                        <span className="font-sans text-[11px] text-[#8a93b4]">
                          {timeAgo(r.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-[#3d4468]">
                        {r.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-2">
                <SystemCommentComposer
                  parentId={c.id}
                  placeholder="Reply to this comment…"
                  compact
                />
              </div>
            </div>
          ))
        )}

        {showComposer ? (
          <SystemCommentComposer
            placeholder="Leave a comment about this system…"
            autoFocus
            onDone={() => setShowComposer(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="flex w-fit items-center gap-1.5 font-sans text-[12.5px] font-bold text-[#707dff] hover:text-[#5062f5] transition-colors"
          >
            <MessageSquare className="size-3.5" />
            Add comment
          </button>
        )}
      </div>
    </article>
  )
}