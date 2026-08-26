import { ClipboardList } from 'lucide-react'
import type { TopicSubmissionItem } from '@/types/milestones'
import { TopicStatusBadge } from '@/components/milestones/topic-submission/TopicStatusBadge'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface TopicSelectRowProps {
  topic: TopicSubmissionItem
  selected: boolean
  disabled: boolean
  onSelect: (topicId: number) => void
}

export function TopicSelectRow({
  topic,
  selected,
  disabled,
  onSelect,
}: TopicSelectRowProps) {
  const isDisabled = disabled || topic.status !== 'APPROVED'

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onSelect(topic.id)}
      disabled={isDisabled}
      className={`group shrink-0 flex flex-col text-left bg-white border rounded-[14px] overflow-hidden shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] transition-colors ${
        selected
          ? 'border-[#707dff] bg-[#f8f9ff]'
          : isDisabled
            ? 'border-[#eceef8] opacity-80 cursor-not-allowed'
            : 'border-[#eceef8] cursor-pointer hover:border-[#707dff]'
      }`}
    >
      <div className="border-b border-[#f0f2fa] px-[16px] py-[14px] shrink-0">
        <div className="flex items-center gap-[8px]">
          <div className="size-[26px] rounded-[8px] bg-[rgba(112,125,255,0.04)] border border-[rgba(112,125,255,0.09)] flex items-center justify-center shrink-0">
            <ClipboardList className="size-[12px] text-[#707dff]" strokeWidth={2} />
          </div>
          <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[-0.125px]">
            Topic {topic.index}
          </p>
          <span
            aria-hidden="true"
            className={`ml-auto size-[18px] shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected
                ? 'border-[#707dff] bg-[#f8f9ff]'
                : isDisabled
                  ? 'border-[#d9deec] bg-[#f4f5fc]'
                  : 'border-[#cfd4e6] bg-white group-hover:border-[#707dff]'
            }`}
          >
            <span
              className={`size-[8px] rounded-full transition-transform ${
                selected ? 'scale-100 bg-[#707dff]' : 'scale-0 bg-transparent'
              }`}
            />
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-[18px] flex flex-col">
        <div className="flex items-center justify-between gap-[8px]">
          <div className="flex items-center gap-[8px] min-w-0">
            <TopicStatusBadge status={topic.status} />
            <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
              v{topic.version}
            </span>
          </div>
        </div>

        <div className="pt-[14px] flex-1 min-h-0 flex flex-col">
          <p
            className={`font-sans font-semibold text-[14px] leading-[19px] ${
              selected ? 'text-[#10133a]' : isDisabled ? 'text-[#9ea8c6]' : 'text-[#10133a]'
            }`}
          >
            {topic.title}
          </p>
          <p
            className={`pt-[6px] font-sans font-medium text-[12.5px] leading-[18.75px] line-clamp-3 ${
              selected ? 'text-[#6b7399]' : isDisabled ? 'text-[#bbc0d8]' : 'text-[#6b7399]'
            }`}
          >
            {topic.background}
          </p>
        </div>

        <div className="flex items-center justify-between pt-[14px]">
          <p className="font-sans font-medium text-[11px] text-[#9ea8c6]">
            Updated {formatDate(topic.updatedAt)}
          </p>
          {selected && (
            <span className="font-sans font-semibold text-[11px] text-[#707dff]">
              Selected
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
