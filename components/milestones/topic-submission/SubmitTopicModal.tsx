'use client'

import { useState } from 'react'
import { Loader2, Plus, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { TopicActionResult } from '@/types/milestones'
import { Modal } from './Modal'

interface SubmitTopicModalProps {
  remaining: number
  onSubmit: (formData: FormData) => Promise<TopicActionResult>
  onClose: () => void
  onSubmitted: () => void
}

export function SubmitTopicModal({
  remaining,
  onSubmit,
  onClose,
  onSubmitted,
}: SubmitTopicModalProps) {
  const [title, setTitle] = useState('')
  const [background, setBackground] = useState('')
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
      title="Submit Topic"
      subtitle="Submit up to 3 topics for Capstone 1. The coordinator reviews each one."
      onClose={onClose}
      footer={
        <>
          <p className="font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
            You have {remaining} topic{remaining === 1 ? '' : 's'} left to submit
          </p>
          <div className="flex items-center gap-[10px]">
            <button
              onClick={onClose}
              className="bg-white border border-[#e8ebf8] rounded-[9px] w-[96px] h-[38px] text-[#5a6382] font-semibold text-[11px] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex items-center justify-center gap-[6px] w-[104px] h-[38px] rounded-[9px] text-white font-semibold text-[11px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{
                backgroundImage: 'linear-gradient(175deg, #707dff 0%, #5565ff 100%)',
              }}
            >
              {submitting ? (
                <Loader2 className="size-[13px] animate-spin" />
              ) : (
                <Plus className="size-[13px]" />
              )}
              Submit Topic
            </button>
          </div>
        </>
      }
    >
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
          rows={5}
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
    </Modal>
  )
}
