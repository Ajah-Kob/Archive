'use client'

import { Eye, Check } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ArchivingReviewItem } from '@/lib/actions/archiving'

const HEADER_LABELS = ['Group', 'Title', 'Date Submitted', 'Status', 'Action']

// Weighted grid: Group+Section 1.2fr | Title 2.2fr | Date 0.9fr | Status 0.7fr | Action 110px — Group smaller, Authors removed
// Matches DefenseTable pattern: header h39 bg #fafbff, rows h60 border #f0f2fa
export const ARCHIVING_GRID_COLS = 'grid-cols-[1.2fr_2.2fr_0.9fr_0.7fr_110px]'

function formatAuthorsShort(authors: ArchivingReviewItem['authorOrder']): string {
  if (!authors || authors.length === 0) return '—'
  return authors
    .map((a) => {
      const last = a.lastName?.trim() ?? ''
      const first = a.firstName?.trim() ?? ''
      if (!last && !first) return a.email ?? ''
      if (!last) return first
      if (!first) return last
      const initials = first
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => `${n[0].toUpperCase()}.`)
        .join('')
      return `${last}, ${initials}`
    })
    .join('; ')
}

function formatDateSubmitted(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: ArchivingReviewItem['status'] }) {
  if (status === 'ARCHIVED') {
    return (
      <span className="inline-flex items-center h-[22px] px-[8px] rounded-[7px] font-sans font-semibold text-[10.5px] leading-[15.75px] whitespace-nowrap border bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]">
        Archived
      </span>
    )
  }
  return (
    <span className="inline-flex items-center h-[22px] px-[8px] rounded-[7px] font-sans font-semibold text-[10.5px] leading-[15.75px] whitespace-nowrap border bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]">
      In Review
    </span>
  )
}

const actionButtonClass =
  'flex items-center justify-center size-[30px] rounded-md border border-[#e8ebf8] bg-white text-[#5a6382] hover:bg-[rgba(112,125,255,0.08)] transition-colors'

const approveButtonClass =
  'flex items-center justify-center size-[30px] rounded-md bg-[#16a34a] text-white hover:bg-[#15803d] border border-[rgba(22,163,74,0.2)] transition-colors'

interface ChairReviewTableProps {
  submissions: ArchivingReviewItem[]
  hasAnySubmissions?: boolean
  onView: (item: ArchivingReviewItem) => void
  onApprove?: (item: ArchivingReviewItem) => void
}

// Empty states use the shared component below.

export function ChairReviewTable({ submissions, hasAnySubmissions = false, onView, onApprove }: ChairReviewTableProps) {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="overflow-x-auto flex-1 min-h-0">
        <div className="min-w-[960px] flex flex-col min-h-full">
          {/* Header */}
          <div
            className={`grid ${ARCHIVING_GRID_COLS} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa] rounded-t-[14px]`}
          >
            {HEADER_LABELS.map((label) => (
              <span
                key={label}
                className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase"
              >
                {label}
              </span>
            ))}
          </div>

          {submissions.length === 0 ? (
            <EmptyState
              heading={hasAnySubmissions ? 'No Matching Submissions' : 'No Submissions for Review'}
              description={
                hasAnySubmissions
                  ? 'No submissions match your search or filter. Try adjusting your search or clear the filter.'
                  : 'When students submit their capstones for archiving, they will appear here for your review and approval.'
              }
              variant="table"
            />
          ) : (
            submissions.map((item) => (
              <div
                key={item.id}
                className={`grid ${ARCHIVING_GRID_COLS} items-center px-[20px] h-[60px] border-b border-[#f0f2fa] last:border-b-0 hover:bg-[#fafbff] transition-colors`}
              >
                {/* Group + Section below */}
                <div className="min-w-0 pr-4 flex flex-col">
                  <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                    {item.groupName}
                  </span>
                  <span className="block truncate font-sans font-medium text-[11px] leading-[16.5px] text-[#8a93b4]">
                    {item.sectionName ?? '—'}
                  </span>
                </div>

                {/* Title */}
                <div className="min-w-0 pr-4">
                  <span
                    className="block truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]"
                    title={item.title}
                  >
                    {item.title}
                  </span>
                </div>

                {/* Date Submitted */}
                <div className="pr-4">
                  <span className="whitespace-nowrap font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
                    {formatDateSubmitted(item.submittedAt)}
                  </span>
                </div>

                {/* Status */}
                <div className="pr-4">
                  <StatusBadge status={item.status} />
                </div>

                {/* Action */}
                <div className="flex items-center justify-end gap-[6px]">
                  <button
                    type="button"
                    title="View Details"
                    aria-label={`View details for ${item.groupName}`}
                    onClick={() => onView(item)}
                    className={actionButtonClass}
                  >
                    <Eye className="size-[16px]" strokeWidth={2} />
                  </button>
                  {item.status === 'IN_REVIEW' && onApprove && (
                    <button
                      type="button"
                      title="Approve"
                      aria-label={`Approve ${item.groupName}`}
                      onClick={() => onApprove(item)}
                      className={approveButtonClass}
                    >
                      <Check className="size-[16px]" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
