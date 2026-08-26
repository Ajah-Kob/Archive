import { Check, ClipboardList, Target } from 'lucide-react'
import type { TopicSubmissionItem } from '@/types/milestones'
import { TopicStatusBadge } from '@/components/milestones/topic-submission/TopicStatusBadge'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface SelectedTopicCardProps {
  selected: TopicSubmissionItem | null
  confirmed: boolean
  confirming: boolean
  onConfirm: () => void
}

export function SelectedTopicCard({
  selected,
  confirmed,
  confirming,
  onConfirm,
}: SelectedTopicCardProps) {
  return (
    <div className="w-[383px] shrink-0 flex flex-col bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="border-b border-[#f0f2fa] px-[16px] py-[14px] shrink-0">
        <div className="flex items-center gap-[8px]">
          <div className="size-[26px] rounded-[8px] bg-[rgba(112,125,255,0.04)] border border-[rgba(112,125,255,0.09)] flex items-center justify-center">
            <Target className="size-[12px] text-[#707dff]" strokeWidth={2} />
          </div>
          <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[-0.125px]">
            Selected Topic
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-[20px] flex flex-col gap-[15px]">
        {!selected ? (
          <div className="flex-1 min-h-0 border-[1.5px] border-dashed border-[#e0e3f0] rounded-[10px] flex flex-col items-center justify-center px-[8px]">
            <div className="size-[36px] rounded-[10px] bg-[#f4f5fc] border border-[#e0e3f0] flex items-center justify-center">
              <Target
                className="size-[16px] text-[#9ea8c6]"
                strokeWidth={1.75}
              />
            </div>
            <p className="pt-[8px] font-sans font-medium text-[12px] leading-[19.2px] text-[#9ea8c6] text-center max-w-[208px]">
              Select a topic to see a summary of your choice.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
              <div className="border-b border-[#f0f2fa] px-[16px] py-[14px] shrink-0">
                <div className="flex items-center gap-[8px]">
                  <div className="size-[26px] rounded-[8px] bg-[rgba(112,125,255,0.04)] border border-[rgba(112,125,255,0.09)] flex items-center justify-center">
                    <ClipboardList
                      className="size-[12px] text-[#707dff]"
                      strokeWidth={2}
                    />
                  </div>
                  <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[-0.125px]">
                    Selected Topic
                  </p>
                </div>
              </div>

              <div className="flex-1 min-h-0 p-[18px] flex flex-col">
                <div className="flex items-center justify-between gap-[8px]">
                  <div className="flex items-center gap-[8px] min-w-0">
                    <TopicStatusBadge status={selected.status} />
                    <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
                      v{selected.version}
                    </span>
                  </div>
                </div>

                <div className="pt-[14px] flex-1 min-h-0 flex flex-col">
                  <p className="font-sans font-semibold text-[14px] leading-[19px] text-[#10133a]">
                    {selected.title}
                  </p>
                  <p className="pt-[6px] font-sans font-medium text-[12.5px] leading-[18.75px] text-[#6b7399]">
                    {selected.background}
                  </p>
                </div>

                <p className="font-sans font-medium text-[11px] text-[#9ea8c6]">
                  Updated {formatDate(selected.updatedAt)}
                </p>
              </div>
            </div>

            {confirmed ? (
              <div className="w-full h-[41.5px] rounded-[9px] bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)] flex items-center justify-center gap-[7px] text-[#16a34a] font-sans font-bold text-[13px]">
                <Check className="size-[14px]" strokeWidth={2.5} />
                Topic Confirmed
              </div>
            ) : (
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirming}
                className="w-full h-[41.5px] rounded-[9px] border border-[rgba(112,125,255,0.69)] shadow-[0px_4px_7px_rgba(112,125,255,0.19)] flex items-center justify-center gap-[7px] text-white font-sans font-bold text-[13px] hover:opacity-95 transition-opacity disabled:opacity-60"
                style={{
                  backgroundImage:
                    'linear-gradient(178deg, #707dff 0%, #5565ff 100%)',
                }}
              >
                <Check className="size-[14px]" strokeWidth={2.5} />
                {confirming ? 'Confirming…' : 'Confirm Topic'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
