'use client'

import { useState } from 'react'
import { Loader2, PencilLine, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { TopicActionResult, TopicSubmissionItem } from '@/types/milestones'
import { Modal } from './Modal'

interface ResubmitTopicModalProps {
  item: TopicSubmissionItem
  onSubmit: (formData: FormData) => Promise<TopicActionResult>
  onClose: () => void
  onSubmitted: () => void
}

export function ResubmitTopicModal({
  item,
  onSubmit,
  onClose,
  onSubmitted,
}: ResubmitTopicModalProps) {
  const [title, setTitle] = useState(item.title)
  const [background, setBackground] = useState(item.background)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wordCount = title.trim() === '' ? 0 : title.trim().split(/\s+/).length
  const isWordCountOverLimit = wordCount > 25
  const isWordCountUnderRecommendation = wordCount > 0 && wordCount < 15

  const canSubmit = title.trim().length > 0 && background.trim().length > 0 && !isWordCountOverLimit

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    if (wordCount > 25) {
      setError('Title must not exceed 25 words.')
      return
    }
    setSubmitting(true)
    setError(null)
    const formData = new FormData()
    formData.set('title', title)
    formData.set('background', background)
    const res = await onSubmit(formData)
    setSubmitting(false)
    if (!res.success) {
      setError(res.message)
      return
    }
    toast.success(res.message)
    onSubmitted()
  }

  return (
    <Modal
      title="Resubmit Topic"
      subtitle="Update your topic based on the feedback provided."
      onClose={onClose}
      width={832}
      footer={
        <div className="flex items-center gap-[10px] ml-auto">
          <button
            onClick={onClose}
            className="bg-white border border-[#e8ebf8] rounded-[9px] w-[96px] h-[38px] text-[#5a6382] font-semibold text-[11px] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex items-center justify-center gap-[6px] w-[128px] h-[38px] rounded-[9px] text-white font-semibold text-[11px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{
              backgroundImage: 'linear-gradient(175deg, #707dff 0%, #5565ff 100%)',
            }}
          >
            {submitting ? (
              <Loader2 className="size-[13px] animate-spin" />
            ) : (
              <PencilLine className="size-[13px]" />
            )}
            Resubmit Topic
          </button>
        </div>
      }
    >
      <div className="flex gap-[16px]">
        <div className="flex-1 min-w-0 flex flex-col gap-[14px]">
          <div className="flex flex-col gap-[8px] w-full">
            <div className="flex justify-between items-center w-full">
              <span className="font-sans font-semibold text-[11px] leading-[16px] text-[#10133a]">
                Title
              </span>
              <span className={`font-sans text-[11px] font-semibold transition-colors ${
                isWordCountOverLimit 
                  ? 'text-[#e11d48]' 
                  : isWordCountUnderRecommendation 
                    ? 'text-[#8a93b4]' 
                    : 'text-[#5565ff]'
              }`}>
                {wordCount} / 25 words
              </span>
            </div>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Enter the title of your capstone topic"
              maxLength={250}
              className={`w-full h-[40px] bg-white border rounded-[9px] px-[14px] text-[12.5px] font-medium text-[#10133a] placeholder:text-[#9ea8c6] outline-none transition-colors ${
                isWordCountOverLimit 
                  ? 'border-[#e11d48] focus:border-[#e11d48]' 
                  : 'border-[#dddff0] focus:border-[#707dff]'
              }`}
            />
            {isWordCountOverLimit && (
              <p className="font-sans font-medium text-[11px] text-[#e11d48]">
                Title must not exceed 25 words.
              </p>
            )}
            {isWordCountUnderRecommendation && (
              <p className="font-sans font-medium text-[11px] text-[#8a93b4]">
                Recommended minimum is 15 words.
              </p>
            )}
          </div>

          <label className="flex flex-col items-start gap-[8px]">
            <span className="font-sans font-semibold text-[11px] leading-[16px] text-[#10133a]">
              Background &amp; Context
            </span>
            <textarea
              value={background}
              onChange={(e) => {
                setBackground(e.target.value)
                if (error) setError(null)
              }}
              rows={7}
              placeholder="Provide a short background about your topic (2-3 sentences)"
              className="w-full resize-none bg-white border border-[#dddff0] rounded-[9px] p-[14px] text-[12.5px] font-medium text-[#10133a] placeholder:text-[#9ea8c6] outline-none focus:border-[#707dff] transition-colors"
            />
          </label>

          {error && (
            <div className="flex gap-[6px] items-start">
              <TriangleAlert className="size-[13px] text-[#e11d48] shrink-0 mt-px" />
              <p className="font-medium text-[12px] leading-[17.4px] text-[#e11d48]">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="w-[280px] shrink-0 bg-[rgba(225,29,72,0.04)] border border-[rgba(225,29,72,0.16)] rounded-[12px] p-[14px] flex flex-col gap-[8px]">
          <p className="font-sans font-bold text-[10.5px] leading-[15.75px] tracking-[0.6px] uppercase text-[#e11d48]">
            Coordinator Feedback
          </p>
          <div className="flex gap-[7px] items-start">
            <TriangleAlert className="size-[13px] text-[#e11d48] shrink-0 mt-px" />
            <p className="font-medium text-[12px] leading-[17.4px] text-[#e11d48]">
              {item.reviewNote || 'No feedback provided yet.'}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
