'use client'

import { useState, useEffect } from 'react'
import { getEvaluationVersions, reviewSubmission } from '@/lib/actions/evaluation'
import { SubmissionHistory } from '@/components/milestones/chapter/SubmissionHistory'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function SubmissionDetailsDrawer({ submissionId, onClose }: { submissionId: number; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getEvaluationVersions(submissionId).then((res) => {
      if (res.success) setData(res.payload)
      else toast.error(res.message)
    })
  }, [submissionId])

  const handleReview = async (decision: 'APPROVED' | 'NEED_REVISION') => {
    setIsSubmitting(true)
    const res = await reviewSubmission(submissionId, decision, note)
    setIsSubmitting(false)
    if (res.success) {
      toast.success(res.message)
      router.refresh()
      onClose()
    } else {
      toast.error(res.message)
    }
  }

  if (!data) return <div>Loading...</div>

  return (
    <div className="p-6">
      <h2 className="font-sora text-[16px] font-semibold text-[#1e3a8a]">Review {data.chapter}</h2>
      
      <div className="mt-6 space-y-4">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add feedback for revision..."
          className="w-full rounded-[10px] border border-[#e0e3f0] p-4 text-[13px]"
        />
        <div className="flex gap-2">
          <button onClick={() => handleReview('APPROVED')} disabled={isSubmitting} className="flex-1 rounded-[10px] bg-[#16a34a] py-2 text-white text-[13px] font-semibold">Approve</button>
          <button onClick={() => handleReview('NEED_REVISION')} disabled={isSubmitting || !note} className="flex-1 rounded-[10px] bg-[#e11d48] py-2 text-white text-[13px] font-semibold">Request Revisions</button>
        </div>
      </div>

      <SubmissionHistory history={data.versions.map((v: any) => ({
        id: v.id,
        version: v.version,
        fileName: v.fileName,
        blobUrl: v.blobUrl,
        submittedBy: v.submittedBy,
        submittedAt: v.createdAt,
        reviewedAt: v.reviewedAt,
        reviewNote: null,
        status: v.status,
        isCurrent: v.isCurrent,
        commentCount: 0,
      }))} />
    </div>
  )
}
