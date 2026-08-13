import { ClipboardList, Eye, PencilLine } from 'lucide-react'
import type { TopicSubmissionItem } from '@/types/milestones'
import { TopicStatusBadge } from './TopicStatusBadge'

interface SubmittedTopicCardProps {
  item: TopicSubmissionItem
  canResubmit: boolean
  onView: () => void
  onEdit: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SubmittedTopicCard({
  item,
  canResubmit,
  onView,
  onEdit,
}: SubmittedTopicCardProps) {
  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col shrink-0">
      <div className="border-b border-[#f0f2fa] px-[16px] py-[14px] shrink-0">
        <div className="flex items-center gap-[8px]">
          <div className="size-[26px] rounded-[8px] bg-[rgba(112,125,255,0.04)] border border-[rgba(112,125,255,0.09)] flex items-center justify-center shrink-0">
            <ClipboardList className="size-[12px] text-[#707dff]" strokeWidth={2} />
          </div>
          <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[-0.125px]">
            Topic {item.index}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-[18px] flex flex-col">
        <div className="flex items-center justify-between gap-[8px]">
          <div className="flex items-center gap-[8px] min-w-0">
            <TopicStatusBadge status={item.status} />
            <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
              v{item.version}
            </span>
          </div>
        </div>

        <div className="pt-[14px] flex-1 min-h-0 flex flex-col">
          <p className="font-sans font-semibold text-[14px] leading-[19px] text-[#10133a]">
            {item.title}
          </p>
          <p className="pt-[6px] font-sans font-medium text-[12.5px] leading-[18.75px] text-[#6b7399] line-clamp-3">
            {item.background}
          </p>
        </div>

        <div className="flex items-center justify-between pt-[14px]">
          <p className="font-sans font-medium text-[11px] text-[#9ea8c6]">
            Updated {formatDate(item.updatedAt)}
          </p>
          <div className="flex items-center gap-[8px]">
            {canResubmit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-[6px] h-[34px] px-[13px] rounded-[9px] text-[11px] font-semibold text-white hover:opacity-95 transition-opacity"
                style={{
                  backgroundImage: 'linear-gradient(175deg, #707dff 0%, #5565ff 100%)',
                }}
              >
                <PencilLine className="size-[12px]" />
                Resubmit Topic
              </button>
            )}
            <button
              onClick={onView}
              className="flex items-center gap-[6px] h-[34px] px-[13px] bg-white border border-[#e8ebf8] rounded-[9px] text-[11px] font-semibold text-[#5a6382] hover:bg-gray-50 transition-colors"
            >
              <Eye className="size-[12px]" />
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
