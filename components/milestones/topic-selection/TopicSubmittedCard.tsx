import { ClipboardList, Lightbulb } from 'lucide-react'
import type { TopicSubmissionItem } from '@/types/milestones'
import { TopicSelectRow } from './TopicSelectRow'

interface TopicSubmittedCardProps {
  topics: TopicSubmissionItem[]
  selectedId: number | null
  confirmed: boolean
  disabled: boolean
  onSelect: (topicId: number) => void
}

export function TopicSubmittedCard({
  topics,
  selectedId,
  confirmed,
  disabled,
  onSelect,
}: TopicSubmittedCardProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="border-b border-[#f0f2fa] px-[16px] py-[14px] shrink-0">
        <div className="flex items-center gap-[8px]">
          <div className="size-[26px] rounded-[8px] bg-[rgba(112,125,255,0.05)] border border-[rgba(112,125,255,0.13)] flex items-center justify-center">
            <ClipboardList className="size-[12px] text-[#707dff]" strokeWidth={2} />
          </div>
          <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[-0.125px]">
            Topic Submitted
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-[16px] flex flex-col gap-[10px]">
        {topics.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-[8px]">
            <div className="size-[44px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
              <Lightbulb
                className="size-[20px] text-[#c4cadf]"
                strokeWidth={1.75}
              />
            </div>
            <p className="pt-[10px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">
              No topics submitted yet
            </p>
            <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px] max-w-[240px]">
              Submit a topic first from the Topic Submission step.
            </p>
          </div>
        ) : (
          topics.map((topic) => (
            <TopicSelectRow
              key={topic.id}
              topic={topic}
              selected={topic.id === selectedId}
              disabled={disabled || confirmed}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
