'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { setSelectedTopic, confirmTopicSelection } from '@/lib/actions/topic'
import type { TopicSelectionPayload } from '@/types/milestones'
import { TopicSubmittedCard } from './TopicSubmittedCard'
import { SelectedTopicCard } from './SelectedTopicCard'

export function TopicSelectionView({ data }: { data: TopicSelectionPayload }) {
  const router = useRouter()
  const selectionRequestId = useRef(0)
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(() => {
    return data.confirmedTopicId ?? data.topics.find((topic) => topic.selectedAt)?.id ?? null
  })
  const [confirming, setConfirming] = useState(false)

  const confirmed = data.confirmedTopicId != null
  const selectedTopic =
    data.topics.find((topic) => topic.id === selectedTopicId) ?? null

  useEffect(() => {
    setSelectedTopicId(
      data.confirmedTopicId ?? data.topics.find((topic) => topic.selectedAt)?.id ?? null,
    )
  }, [data.confirmedTopicId, data.topics])

  const handleSelect = async (topicId: number) => {
    if (confirmed) return

    const requestId = ++selectionRequestId.current
    const previousSelectedId = selectedTopicId
    const nextSelectedId = previousSelectedId === topicId ? null : topicId

    setSelectedTopicId(nextSelectedId)

    try {
      const res = await setSelectedTopic(topicId)
      if (requestId !== selectionRequestId.current) return

      if (res.success) {
        router.refresh()
      } else {
        setSelectedTopicId(previousSelectedId)
        toast.error(res.message)
      }
    } catch {
      if (requestId !== selectionRequestId.current) return
      setSelectedTopicId(previousSelectedId)
      toast.error('Something went wrong while updating the selected topic.')
    }
  }

  const handleConfirm = async () => {
    if (!selectedTopic || confirmed || confirming) return
    setConfirming(true)
    try {
      const res = await confirmTopicSelection(selectedTopic.id)
      if (res.success) {
        toast.success(res.message)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex-1 min-h-0 flex gap-[16px]">
      <div className="flex-1 min-w-0 flex flex-col">
        <TopicSubmittedCard
          topics={data.topics}
          selectedId={selectedTopic?.id ?? null}
          confirmed={confirmed}
          disabled={confirmed}
          onSelect={handleSelect}
        />
      </div>

      <SelectedTopicCard
        selected={selectedTopic}
        confirmed={confirmed}
        confirming={confirming}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
