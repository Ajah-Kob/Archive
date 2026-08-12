import { Check, Clock, TriangleAlert } from 'lucide-react'
import type { TopicSubmissionStatus } from '@/types/milestones'

const STATUS_META: Record<
  TopicSubmissionStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  APPROVED: {
    label: 'Approved',
    className:
      'bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)] text-[#16a34a]',
    icon: Check,
  },
  PENDING: {
    label: 'Pending',
    className:
      'bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] text-[#f59e0b]',
    icon: Clock,
  },
  NEED_REVISION: {
    label: 'Need Revision',
    className:
      'bg-[rgba(225,29,72,0.07)] border border-[rgba(225,29,72,0.2)] text-[#e11d48]',
    icon: TriangleAlert,
  },
}

export function TopicStatusBadge({ status }: { status: TopicSubmissionStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-[5px] h-[22px] px-[8px] rounded-[7px] font-sans font-semibold text-[10.5px] whitespace-nowrap ${meta.className}`}
    >
      <Icon className="size-[11px]" strokeWidth={2.5} />
      {meta.label}
    </span>
  )
}
