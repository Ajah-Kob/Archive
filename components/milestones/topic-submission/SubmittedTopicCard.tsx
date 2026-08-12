import { Eye, PencilLine } from 'lucide-react'
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
    <div className="bg-white border border-[#e8ebf8] rounded-[12px] p-[18px] flex flex-col shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          <p className="font-sans font-semibold text-[13px] leading-[15.6px] text-[#10133a]">
            Topic {item.index}
          </p>
          <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff]">
            v{item.version}
          </span>
        </div>
        <TopicStatusBadge status={item.status} />
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
              Edit Topic
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
  )
}
