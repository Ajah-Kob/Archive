'use client'

import { Check, Eye } from 'lucide-react'
import type { ArchivingReviewItem } from '@/lib/actions/archiving'
import { formatDateSubmitted, StatusBadge } from './ChairReviewTable'

/**
 * Mobile counterpart to the ChairReviewTable row — one card per submission,
 * below `sm`.
 *
 * The table is a five-column grid at `min-w-[960px]`, so on a phone it was a
 * horizontal scroll to read one submission. This stacks the same fields in
 * reading order: the group and its section, the capstone title, the submitted
 * date, then the status badge and the actions.
 *
 * The title is the thing a reviewer scans for, so it gets the full width and
 * wraps to a second and third line rather than truncating — the row could
 * truncate because the neighbouring columns kept the title on one line, which a
 * single-column card has no need to do.
 *
 * The date formatter and the status badge are imported from ChairReviewTable
 * rather than restated, so the two renderings cannot disagree about a
 * submission.
 */
export function ArchivingReviewCard({
  item,
  onView,
  onApprove,
}: {
  item: ArchivingReviewItem
  onView: (item: ArchivingReviewItem) => void
  onApprove?: (item: ArchivingReviewItem) => void
}) {
  return (
    <div className="flex flex-col gap-[8px] mb-[10px] last:mb-0 rounded-[12px] border border-[#eceef8] bg-white px-[12px] py-[12px]">
      {/* Group, with its section beneath — the same pairing the row uses. */}
      <div className="flex flex-col gap-[2px] min-w-0">
        <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
          {item.groupName}
        </span>
        <span className="block truncate font-sans font-medium text-[11px] leading-[16.5px] text-[#8a93b4]">
          {item.sectionName ?? '—'}
        </span>
      </div>

      <span className="block font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566] break-words">
        {item.title}
      </span>

      {/* Submitted date, with the status badge opposite it. */}
      <div className="flex items-center justify-between gap-[10px]">
        <span className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          Submitted {formatDateSubmitted(item.submittedAt)}
        </span>
        <StatusBadge status={item.status} />
      </div>

      <div className="flex items-center justify-end gap-[6px] border-t border-[#f0f2fa] pt-[10px] mt-[2px]">
        <button
          type="button"
          title="View Details"
          aria-label={`View details for ${item.groupName}`}
          onClick={() => onView(item)}
          className="flex items-center justify-center size-[30px] rounded-md border border-[#e8ebf8] bg-white text-[#5a6382] hover:bg-[rgba(112,125,255,0.08)] transition-colors"
        >
          <Eye className="size-[16px]" strokeWidth={2} />
        </button>
        {item.status === 'IN_REVIEW' && onApprove && (
          <button
            type="button"
            title="Approve"
            aria-label={`Approve ${item.groupName}`}
            onClick={() => onApprove(item)}
            className="flex items-center justify-center size-[30px] rounded-md bg-[#16a34a] text-white hover:bg-[#15803d] border border-[rgba(22,163,74,0.2)] transition-colors"
          >
            <Check className="size-[16px]" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}