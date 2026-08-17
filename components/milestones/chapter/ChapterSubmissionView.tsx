'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ChapterSubmissionPayload } from '@/types/milestones'
import { StatusCallout } from './StatusCallout'
import { UploadDropzone } from './UploadDropzone'
import { SubmissionHistory } from './SubmissionHistory'
import { ReviewFeedbackModal } from './ReviewFeedbackModal'

export function ChapterSubmissionView({
  payload,
}: {
  payload: ChapterSubmissionPayload
}) {
  const router = useRouter()
  const [feedbackOpen, setFeedbackOpen] = useState(false)

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

  return (
    <div className="flex flex-col gap-[16px]">
      <StatusCallout
        state={payload.state}
        chapterLabel={payload.chapter.label}
        current={payload.current}
        onReviewFeedback={() => setFeedbackOpen(true)}
      />

      <UploadDropzone
        chapter={payload.chapter.key}
        chapterLabel={payload.chapter.label}
        state={payload.state}
        currentFileName={payload.current?.fileName ?? null}
        submittedAt={payload.current?.submittedAt ?? null}
        currentSize={payload.current?.size ?? null}
        canSubmit={payload.canSubmit}
        onSubmitted={refresh}
      />

      <SubmissionHistory history={payload.history} />

      {feedbackOpen && payload.current && (
        <ReviewFeedbackModal
          item={payload.current}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  )
}