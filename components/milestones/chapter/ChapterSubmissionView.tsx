'use client'

import { useState } from 'react'
import { StatusCallout } from './StatusCallout'
import { UploadDropzone } from './UploadDropzone'
import { SubmissionHistory } from './SubmissionHistory'
import { type ChapterSubmissionPayload } from '@/types/milestones'
import { submitChapter, resubmitChapter } from '@/lib/actions/chapter'
import { toast } from 'sonner'

export function ChapterSubmissionView({ payload }: { payload: ChapterSubmissionPayload }) {
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!file) return
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('file', file)
    
    const action = payload.current ? resubmitChapter : submitChapter
    const result = await action(payload.chapter.key, formData)
    
    setIsSubmitting(false)
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="space-y-6">
      {payload.current && (
        <StatusCallout
          status={
            payload.state === 'NEEDS_REVISION' 
              ? 'NEED_REVISION' 
              : payload.state === 'APPROVED' 
                ? 'APPROVED' 
                : 'PENDING'
          }
          message={payload.state === 'NEEDS_REVISION' ? 'Please review the adviser feedback and resubmit.' : 'Your submission is being reviewed by your adviser.'}
          onAction={payload.state === 'NEEDS_REVISION' ? () => {} : undefined}
          actionLabel="View Feedback"
        />
      )}
      
      {payload.canSubmit && (
        <div className="rounded-[14px] border border-[#e0e3f0] p-6 bg-white">
          <UploadDropzone onFileSelect={setFile} disabled={isSubmitting} />
          <button
            onClick={handleSubmit}
            disabled={!file || isSubmitting}
            className="mt-6 w-full rounded-[10px] bg-[#707dff] px-6 py-3 font-sora text-[14px] font-semibold text-white shadow-[0px_4px_8px_rgba(112,125,255,0.2)] disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : payload.current ? 'Resubmit Chapter' : 'Submit Chapter'}
          </button>
        </div>
      )}

      <SubmissionHistory history={payload.history} />
    </div>
  )
}

export function LockedChapterPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center rounded-[14px] border border-[#e0e3f0] bg-[#f8f9ff]">
      <p className="font-sora text-[14px] font-semibold text-[#1e3a8a]">{label} is currently locked.</p>
      <p className="text-[12px] text-[#5a6382]">Please wait for your coordinator to open this chapter.</p>
    </div>
  )
}
