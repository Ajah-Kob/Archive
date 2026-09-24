import type { SubmissionViewStatus } from '@/types/milestones'

const STATUS_STYLES: Record<SubmissionViewStatus, string> = {
  APPROVED: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]',
  NEEDS_REVISION: 'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)] text-[#e11d48]',
  IN_REVIEW: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  SUPERSEDED: 'bg-[#f4f5fc] border-[#e0e3f0] text-[#9ea8c6]',
}

const STATUS_LABELS: Record<SubmissionViewStatus, string> = {
  APPROVED: 'Approved',
  NEEDS_REVISION: 'Needs Revision',
  IN_REVIEW: 'In Review',
  SUPERSEDED: 'Superseded',
}

export function SubmissionStatusBadge({
  status,
  inReviewLabel = 'In Review',
}: {
  status: SubmissionViewStatus
  /** Override for the IN_REVIEW label (e.g. "For Review" for reviewers). */
  inReviewLabel?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] text-[11px] font-bold leading-[16px] ${STATUS_STYLES[status]}`}
    >
      {status === 'IN_REVIEW' ? inReviewLabel : STATUS_LABELS[status]}
    </span>
  )
}
