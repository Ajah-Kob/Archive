'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import type { PendingTopic } from '@/lib/actions/sections'
import { TopicReviewModal } from './TopicReviewModal'

interface TopicReviewQueueProps {
  topics: PendingTopic[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TopicReviewQueue({ topics }: TopicReviewQueueProps) {
  const [reviewTarget, setReviewTarget] = useState<PendingTopic | null>(null)

  if (topics.length === 0) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex-1 flex flex-col items-center justify-center px-10 py-16">
        <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
          <FileText className="size-5 text-[#707dff]" strokeWidth={1.75} />
        </div>
        <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
          No Pending Topic Reviews
        </h3>
        <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#8a93b4] text-center max-w-[360px]">
          Topics submitted by groups in this section will appear here for your
          review.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2.5 px-5 py-[14px] border-b border-[#f0f2fa] shrink-0">
          <h3 className="font-heading font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
            Pending Topic Reviews
          </h3>
          <span className="font-sans font-semibold text-[12px] leading-[18px] text-[#9ea8c6]">
            {topics.length} {topics.length === 1 ? 'submission' : 'submissions'}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-[1.4fr_2fr_1.2fr_1fr_0.7fr] items-center px-[20px] h-[40px] border-b border-[#f0f2fa] bg-[#fafbff] sticky top-0">
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Group
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Topic
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Submitted by
            </span>
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Date
            </span>
            <span className="text-right font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6]">
              Action
            </span>
          </div>

          {topics.map((topic) => (
            <div
              key={topic.id}
              className="w-full grid grid-cols-[1.4fr_2fr_1.2fr_1fr_0.7fr] items-center px-[20px] h-[58px] border-b border-[#f0f2fa] last:border-b-0 hover:bg-slate-50/60 transition-colors"
            >
              <span className="min-w-0 pr-4">
                <span className="block truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                  {topic.groupName}
                </span>
              </span>

              <span className="min-w-0 pr-4">
                <span className="block truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#3d4566]">
                  {topic.title}
                </span>
              </span>

              <span className="min-w-0 pr-4">
                <span className="block truncate font-sans font-medium text-[12.5px] leading-[18.75px] text-[#6b7399]">
                  {topic.submittedBy || 'Unknown'}
                </span>
              </span>

              <span className="pr-4 font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
                {formatDate(topic.createdAt)}
              </span>

              <span className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setReviewTarget(topic)}
                  className="flex gap-[6px] items-center h-[30px] px-[11px] rounded-[8px] font-sans font-bold text-[12px] leading-[18px] text-white hover:opacity-90 active:scale-[0.98] transition-all"
                  style={{
                    backgroundImage:
                      'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
                    boxShadow: '0px 2px 6px rgba(112,125,255,0.25)',
                  }}
                >
                  Review
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <TopicReviewModal
        topic={reviewTarget}
        onClose={() => setReviewTarget(null)}
      />
    </>
  )
}
