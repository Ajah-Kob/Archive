'use client'

import { Check, FileUp, PenLine } from 'lucide-react'
import { LatestDocumentCardRoot } from './DefenseDocumentCard/Root'
import { LatestDocumentCardHeader } from './DefenseDocumentCard/Header'
import { LatestDocumentCardBody } from './DefenseDocumentCard/Body'
import { deriveResubmissionActivity } from '@/lib/defense/session-helpers'
import type { ResubmissionActivityEntry } from '@/lib/defense/session-helpers'

/**
 * ResubmissionActivityFeed — replaces the Approval Checklist.
 *
 * A read-only timeline of what has happened across EVERY resubmission the group
 * has submitted. It is deliberately NOT a progress tracker: the panelist's own
 * verdict is shown in the status callout, so nothing here should read as
 * "waiting for someone else". It exists only to give context.
 *
 * Pending reviews are omitted upstream (nothing has happened yet), and a
 * carried-forward decision is credited once, to the version that was uploaded
 * when the decision was made.
 */

export interface ResubmissionActivityFeedProps {
  versions: Array<{
    version: number
    isInitial?: boolean
    dateSubmitted?: string
    submittedByName?: string
    reviews?: Array<{
      panelistId: number
      name?: string
      status: string
      reviewedAt?: string | null
    }>
  }>
  /** Pre-derived entries; skips re-deriving when the caller already has them. */
  entries?: ResubmissionActivityEntry[]
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function entryMeta(kind: ResubmissionActivityEntry['kind']) {
  if (kind === 'UPLOAD') {
    return {
      Icon: FileUp,
      tile: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]',
      tone: 'text-[#707dff]',
    }
  }
  if (kind === 'APPROVED') {
    return {
      Icon: Check,
      tile: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
      tone: 'text-[#16a34a]',
    }
  }
  return {
    Icon: PenLine,
    tile: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]',
    tone: 'text-[#e11d48]',
  }
}

function entryText(entry: ResubmissionActivityEntry): string {
  if (entry.kind === 'UPLOAD') return `${entry.actor} uploaded version ${entry.version}`
  if (entry.kind === 'APPROVED') return `${entry.actor} approved version ${entry.version}`
  return `${entry.actor} requested revisions on version ${entry.version}`
}

export function ResubmissionActivityFeed({ versions, entries }: ResubmissionActivityFeedProps) {
  const feed = entries ?? deriveResubmissionActivity(versions)

  return (
    <LatestDocumentCardRoot>
      <LatestDocumentCardHeader>Activity</LatestDocumentCardHeader>
      <LatestDocumentCardBody>
        {feed.length === 0 ? (
          <p className="py-6 text-center font-sans font-medium text-[13px] text-[#8a93b4]">
            No resubmission activity yet.
          </p>
        ) : (
          <ol className="flex flex-col">
            {feed.map((entry, index) => {
              const { Icon, tile, tone } = entryMeta(entry.kind)
              const isLast = index === feed.length - 1
              return (
                <li key={entry.id} className="flex gap-[12px]">
                  {/* Rail: the connector stops at the last entry so the
                      timeline does not appear to continue past its end. */}
                  <div className="flex flex-col items-center shrink-0">
                    <span
                      className={`flex size-[28px] items-center justify-center rounded-full border shrink-0 ${tile}`}
                    >
                      <Icon className={`size-[13px] ${tone}`} strokeWidth={2} />
                    </span>
                    {isLast ? null : (
                      <span className="w-px flex-1 min-h-[20px] bg-[#eceef8]" aria-hidden="true" />
                    )}
                  </div>
                  <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-[16px]'}`}>
                    <p className="font-sans font-semibold text-[12.5px] leading-[18px] text-[#3d4566]">
                      {entryText(entry)}
                    </p>
                    <p className="pt-[2px] font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                      {formatDateTime(entry.at)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </LatestDocumentCardBody>
    </LatestDocumentCardRoot>
  )
}

export default ResubmissionActivityFeed
