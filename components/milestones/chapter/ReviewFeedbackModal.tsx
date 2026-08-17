'use client'

import { X } from 'lucide-react'
import type { ChapterVersionItem } from '@/types/milestones'

interface ReviewFeedbackModalProps {
  item: ChapterVersionItem
  onClose: () => void
}

export function ReviewFeedbackModal({ item, onClose }: ReviewFeedbackModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,58,138,0.3)]">
      <div className="w-full max-w-[480px] rounded-[16px] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-sora text-[16px] font-semibold text-[#1e3a8a]">
            Adviser Feedback
          </h3>
          <button onClick={onClose} aria-label="Close">
            <X className="size-[20px] text-[#5a6382]" />
          </button>
        </div>
        <div className="mt-4 rounded-[10px] bg-[#f8f9ff] p-4 text-[13px] text-[#1e3a8a]">
          {item.reviewNote || 'No feedback provided.'}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-[10px] bg-[#707dff] px-6 py-3 font-sora text-[14px] font-semibold text-white"
        >
          Close
        </button>
      </div>
    </div>
  )
}