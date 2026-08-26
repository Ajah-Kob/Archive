'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Lightbulb } from 'lucide-react'
import { submitTopic, resubmitTopic } from '@/lib/actions/topic'
import type {
  TopicActionResult,
  TopicSubmissionItem,
  TopicSubmissionPayload,
} from '@/types/milestones'
import { SummaryCard } from './SummaryCard'
import { SubmittedTopicCard } from './SubmittedTopicCard'
import { SubmissionHistory } from './SubmissionHistory'
import { SubmitTopicModal } from './SubmitTopicModal'
import { ResubmitTopicModal } from './ResubmitTopicModal'
import { TopicDetailModal } from './TopicDetailModal'

export function TopicSubmissionView({
  data,
}: {
  data: TopicSubmissionPayload
}) {
  const router = useRouter()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [editing, setEditing] = useState<TopicSubmissionItem | null>(null)
  const [viewing, setViewing] = useState<TopicSubmissionItem | null>(null)
  const [topics, setTopics] = useState(data.topics)

  useEffect(() => {
    setTopics(data.topics)
  }, [data.topics])

  useEffect(() => {
    const syncFromServer = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }

    window.addEventListener('focus', syncFromServer)
    document.addEventListener('visibilitychange', syncFromServer)
    return () => {
      window.removeEventListener('focus', syncFromServer)
      document.removeEventListener('visibilitychange', syncFromServer)
    }
  }, [router])

  const refresh = () => router.refresh()

  const handleSubmit = async (
    formData: FormData,
  ): Promise<TopicActionResult> => {
    return submitTopic(null, formData)
  }

  const handleResubmit = async (
    item: TopicSubmissionItem,
    formData: FormData,
  ): Promise<TopicActionResult> => {
    return resubmitTopic(item.id, null, formData)
  }

  return (
    <div className="flex-1 min-h-0 flex gap-[16px]">
      <div className="flex-1 min-w-0 flex flex-col gap-[16px]">
        <SummaryCard
          count={topics.length}
          cap={data.cap}
          hasApproved={data.hasApproved}
          canSubmit={data.canSubmit}
          onOpenSubmit={() => setSubmitOpen(true)}
        />

        <div className="flex-1 min-h-0 bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
          <div className="border-b border-[#f0f2fa] px-[16px] py-[14px] shrink-0">
            <div className="flex items-center justify-between gap-[12px]">
              <div className="flex items-center gap-[8px] min-w-0">
                <div className="size-[26px] rounded-[8px] bg-[rgba(112,125,255,0.04)] border border-[rgba(112,125,255,0.09)] flex items-center justify-center shrink-0">
                  <ClipboardList
                    className="size-[12px] text-[#707dff]"
                    strokeWidth={2}
                  />
                </div>
                <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[-0.125px]">
                  Submitted Topics
                </p>
              </div>
              <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[8px] py-[2px] font-sans font-bold text-[10.5px] text-[#707dff] shrink-0">
                {topics.length}/{data.cap}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
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
                  Click &quot;Submit Topic&quot; to start your capstone topic.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto p-[16px] flex flex-col gap-[10px]">
                {topics.map((topic) => (
                  <SubmittedTopicCard
                    key={topic.id}
                    item={topic}
                    canResubmit={
                      !data.hasApproved && topic.status === 'NEED_REVISION'
                    }
                    onView={() => setViewing(topic)}
                    onEdit={() => setEditing(topic)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SubmissionHistory
        history={data.history}
        onView={(item) => setViewing(item)}
      />

      {submitOpen && (
        <SubmitTopicModal
          remaining={data.cap - topics.length}
          onSubmit={handleSubmit}
          onClose={() => setSubmitOpen(false)}
          onSubmitted={() => {
            setSubmitOpen(false)
            refresh()
          }}
        />
      )}

      {editing && (
        <ResubmitTopicModal
          item={editing}
          onSubmit={(formData) => handleResubmit(editing, formData)}
          onClose={() => setEditing(null)}
          onSubmitted={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {viewing && (
        <TopicDetailModal item={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
