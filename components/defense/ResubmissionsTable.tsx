'use client'

import { useRouter } from 'next/navigation'
import { ClipboardCheck, FileText } from 'lucide-react'
import type { DefenseQueuePayload } from '@/lib/actions/defense'

// Grid template for the resubmissions table — mirrors the Document Review
// table's proportions (Group is widest, action column hugs its button).
const GRID_COLS = 'grid-cols-[2fr_1fr_1.2fr_1fr_1fr_auto]'

// Previous-verdict badge styling, matching the existing defense verdict badges.
const VERDICT_STYLES = {
  MINOR_REVISION:
    'bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.25)] text-[#3b82f6]',
  MAJOR_REVISION:
    'bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.25)] text-[#f97316]',
} as const

const VERDICT_LABELS = {
  MINOR_REVISION: 'Minor Revision',
  MAJOR_REVISION: 'Major Revision',
} as const

const HEADER_LABELS = [
  'Group',
  'Section',
  'Previous Verdict',
  'Defense Date',
  'Date Submitted',
  'Action',
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function VerdictBadge({
  verdict,
}: {
  verdict: DefenseQueuePayload['previousVerdict']
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] text-[11px] font-bold leading-[16px] whitespace-nowrap ${VERDICT_STYLES[verdict]}`}
    >
      {VERDICT_LABELS[verdict]}
    </span>
  )
}

interface ResubmissionsTableProps {
  items: DefenseQueuePayload[]
}

/**
 * Resubmissions tab — the panelist's personal revision-evaluation queue.
 * Reproduces the Document Review table's visual language (layout, row height,
 * typography, badges, hover, empty state) while showing resubmitted documents
 * that the current faculty member still needs to evaluate.
 */
export function ResubmissionsTable({ items }: ResubmissionsTableProps) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col items-center justify-center px-10 py-16">
        <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
          <ClipboardCheck
            className="size-5 text-[#707dff]"
            strokeWidth={1.75}
          />
        </div>
        <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
          No resubmissions to review
        </h3>
        <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
          You&apos;ll see revised documents here when a student submits a
          revision that requires your review.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="min-w-[900px] flex flex-col min-h-full">
          <div
            className={`grid ${GRID_COLS} items-center px-[20px] h-[40px] border-b border-[#f0f2fa] bg-[#fafbff] sticky top-0`}
          >
            {HEADER_LABELS.map((label) => (
              <span
                key={label}
                className="text-[11px] font-bold text-[#9ea8c6] tracking-[0.6px] uppercase select-none"
              >
                {label}
              </span>
            ))}
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className={`w-full grid ${GRID_COLS} items-center px-[20px] h-[58px] border-b border-[#f0f2fa] last:border-b-0 hover:bg-slate-50/60 transition-colors`}
            >
              <span className="min-w-0 pr-4">
                <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                  {item.groupName}
                </span>
                <span className="block truncate font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                  {item.fileName} · {formatSize(item.size)}
                </span>
              </span>

              <span className="min-w-0 pr-4">
                <span className="block truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                  {item.sectionName}
                </span>
              </span>

              <span className="min-w-0 pr-4">
                <VerdictBadge verdict={item.previousVerdict} />
              </span>

              <span className="min-w-0 pr-4">
                <span className="block truncate font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
                  {formatDate(item.defenseDate)}
                </span>
              </span>

              <span className="min-w-0 pr-4">
                <span className="block truncate font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
                  {formatDate(item.dateSubmitted)}
                </span>
              </span>

              <span className="flex items-center justify-end gap-[6px]">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/faculty/defense/${item.scheduleId}`)
                  }
                  title="Evaluate Document"
                  aria-label={`Evaluate ${item.groupName} resubmission`}
                  className="flex items-center gap-[5px] h-[28px] px-[11px] bg-[#707dff] rounded-[7px] font-sans font-semibold text-[11px] text-white hover:bg-[#5565ff] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] focus-visible:ring-offset-1"
                >
                  <ClipboardCheck
                    className="size-[12px]"
                    strokeWidth={2.25}
                  />
                  Evaluate Document
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}