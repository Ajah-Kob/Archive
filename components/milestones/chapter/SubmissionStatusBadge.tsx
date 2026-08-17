import type { SubmissionViewStatus } from '@/types/milestones'

const STATUS_STYLES: Record<SubmissionViewStatus, string> = {
  APPROVED: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]',
  NEEDS_REVISION: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  IN_REVIEW: 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.2)] text-[#707dff]',
  SUPERSEDED: 'bg-[#f4f5fc] border-[#e0e3f0] text-[#9ea8c6]',
}

const STATUS_LABELS: Record<SubmissionViewStatus, string> = {
  APPROVED: 'Approved',
  NEEDS_REVISION: 'Needs Revision',
  IN_REVIEW: 'In Review',
  SUPERSEDED: 'Superseded',
}

export function SubmissionStatusBadge({ status }: { status: SubmissionViewStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] text-[11px] font-bold leading-[16px] ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
