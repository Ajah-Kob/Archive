'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ChapterSubmissionPayload } from '@/types/milestones'
import { StatusCallout } from './StatusCallout'
import { UploadDropzone } from './UploadDropzone'
import { SubmissionHistory } from './SubmissionHistory'

export function ChapterSubmissionView({
  payload,
}: {
  payload: ChapterSubmissionPayload
}) {
  const router = useRouter()

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
    <div className="flex min-h-0 flex-1 flex-col gap-[16px]">
      <StatusCallout
        state={payload.state}
        chapterLabel={payload.chapter.label}
        current={payload.current}
        onReviewFeedback={
          payload.current
            ? () =>
                router.push(`/student/milestone/review/${payload.current!.id}`)
            : undefined
        }
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

      {/* Fills the remaining page height; its rows scroll internally. */}
      <SubmissionHistory history={payload.history} />
    </div>
  )
}