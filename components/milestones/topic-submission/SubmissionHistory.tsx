import { Eye, History } from 'lucide-react'
import type { TopicSubmissionItem } from '@/types/milestones'
import { TopicStatusBadge } from './TopicStatusBadge'

interface SubmissionHistoryProps {
  history: TopicSubmissionItem[]
  onView: (item: TopicSubmissionItem) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SubmissionHistory({ history, onView }: SubmissionHistoryProps) {
  return (
    <div className="w-[383px] h-full shrink-0 bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] flex flex-col min-h-0">
      <div className="flex items-center gap-[8px]">
        <p className="font-heading font-bold text-[15px] leading-[22.5px] text-[#12143a] tracking-[-0.15px]">
          Submission History
        </p>
        {history.length > 0 && (
          <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[8px] py-[2px] font-sans font-bold text-[10.5px] text-[#707dff]">
            {history.length}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pt-[12px] pr-[2px]">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-[8px]">
            <div className="size-[44px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
              <History className="size-[20px] text-[#c4cadf]" strokeWidth={1.75} />
            </div>
            <p className="pt-[10px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">
              No previous versions
            </p>
            <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px]">
              Resubmissions of a topic will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-[10px] py-[13px] border-b border-[#f4f5fc] last:border-b-0"
              >
                <div className="flex items-center justify-between gap-[8px]">
                  <div className="flex items-center gap-[7px] min-w-px">
                    <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
                      v{item.version}
                    </span>
                    <p className="truncate font-sans font-semibold text-[12.5px] leading-[17px] text-[#3c4268]">
                      Topic {item.index} — Version {item.version}
                    </p>
                  </div>
                  <TopicStatusBadge status={item.status} />
                </div>

                <div className="flex items-center justify-between gap-[8px]">
                  <p className="font-sans font-medium text-[11px] text-[#9ea8c6]">
                    Submitted {formatDate(item.createdAt)}
                  </p>
                  <button
                    onClick={() => onView(item)}
                    className="flex items-center gap-[5px] h-[26px] px-[10px] bg-white border border-[#e8ebf8] rounded-[7px] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0"
                  >
                    <Eye className="size-[11px]" />
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
