'use client'

import { useState, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import { Lightbulb } from 'lucide-react'
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

type OptimisticAction =
  | { type: 'add'; item: TopicSubmissionItem }
  | { type: 'replace'; id: number; item: TopicSubmissionItem }

export function TopicSubmissionView({
  data,
}: {
  data: TopicSubmissionPayload
}) {
  const router = useRouter()
  const [submitOpen, setSubmitOpen] = useState(false)
  const [editing, setEditing] = useState<TopicSubmissionItem | null>(null)
  const [viewing, setViewing] = useState<TopicSubmissionItem | null>(null)

  const [topics, addOptimisticTopic] = useOptimistic(
    data.topics,
    (state: TopicSubmissionItem[], action: OptimisticAction) => {
      if (action.type === 'add') return [...state, action.item]
      return state.map((t) => (t.id === action.id ? action.item : t))
    },
  )

  const refresh = () => router.refresh()

  const handleSubmit = async (
    formData: FormData,
  ): Promise<TopicActionResult> => {
    const title = formData.get('title')?.toString().trim() ?? ''
    const background = formData.get('background')?.toString().trim() ?? ''
    const now = new Date().toISOString()
    addOptimisticTopic({
      type: 'add',
      item: {
        id: -Date.now(),
        title,
        background,
        status: 'PENDING',
        version: 1,
        index: topics.length + 1,
        createdAt: now,
        updatedAt: now,
        reviewNote: null,
        reviewedAt: null,
        submittedBy: null,
      },
    })
    const res = await submitTopic(null, formData)
    refresh()
    return res
  }

  const handleResubmit = async (
    item: TopicSubmissionItem,
    formData: FormData,
  ): Promise<TopicActionResult> => {
    const title = formData.get('title')?.toString().trim() ?? ''
    const background = formData.get('background')?.toString().trim() ?? ''
    const now = new Date().toISOString()
    addOptimisticTopic({
      type: 'replace',
      id: item.id,
      item: {
        id: -Date.now(),
        title,
        background,
        status: 'PENDING',
        version: item.version + 1,
        index: item.index,
        createdAt: now,
        updatedAt: now,
        reviewNote: null,
        reviewedAt: null,
        submittedBy: null,
      },
    })
    const res = await resubmitTopic(item.id, null, formData)
    refresh()
    return res
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

        <div className="flex-1 h-full min-h-0 bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] flex flex-col">
          <div className="flex items-center gap-[8px]">
            <p className="font-heading font-bold text-[15px] leading-[22.5px] text-[#12143a] tracking-[-0.15px]">
              Submitted Topics
            </p>
            <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[8px] py-[2px] font-sans font-bold text-[10.5px] text-[#707dff]">
              {topics.length}/{data.cap}
            </span>
          </div>

          {topics.length === 0 ? (
            <div className="flex flex-col items-center text-center px-[8px]">
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
            <div className="flex-1 min-h-0 overflow-y-auto pr-[2px] pt-[12px] flex flex-col gap-[14px]">
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
