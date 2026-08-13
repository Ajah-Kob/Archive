'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { reviewTopic, type PendingTopic } from '@/lib/actions/sections'
import { TopicInfoBox } from './TopicInfoBox'

interface TopicReviewModalProps {
  topic: PendingTopic | null
  onClose: () => void
}

export function TopicReviewModal({ topic, onClose }: TopicReviewModalProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setNote('')
    setBusy(false)
  }, [topic?.id])

  async function submit() {
    if (!topic) return
    setBusy(true)
    const res = await reviewTopic(topic.id, 'NEED_REVISION', note)
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      onClose()
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  if (!topic) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,18,40,0.45)] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[500px] max-w-full rounded-[16px] shadow-[0px_24px_64px_0px_rgba(30,58,138,0.18),0px_4px_16px_0px_rgba(0,0,0,0.08)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex items-center justify-between px-[22px] pt-[18px] pb-[16px] border-b border-[#f0f2fa] shrink-0">
          <div className="flex gap-[10px] items-center">
            <div className="size-[30px] rounded-[8px] bg-[rgba(245,158,11,0.08)] flex items-center justify-center">
              <RotateCcw className="size-[14px] text-[#f59e0b]" />
            </div>
            <h2 className="font-['Sora',sans-serif] font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
              Request Revision
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="size-[28px] rounded-[7px] bg-[#f4f5fc] border border-[#e8ebf8] flex items-center justify-center cursor-pointer hover:bg-[#eef0fb] transition-colors"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <div className="px-[22px] py-[20px] flex flex-col gap-[16px] overflow-y-auto">
          <TopicInfoBox
            groupName={topic.groupName}
            title={topic.title}
            background={topic.background}
          />

          <div className="flex flex-col items-start gap-[6px]">
            <label className="font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Add feedback for the group…"
              className="w-full px-[14px] py-[10px] bg-white border border-[#e8ebf8] rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.04)] font-sans font-semibold text-[13px] text-[#3d4566] outline-none focus:border-[rgba(112,125,255,0.5)] transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-[10px] px-[22px] pt-[16px] pb-[16px] border-t border-[#f0f2fa] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="bg-white border border-[#e8ebf8] rounded-[9px] w-[96px] h-[38px] text-[#5a6382] font-semibold text-[11px] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="flex gap-[6px] items-center px-[16px] py-[9px] rounded-[10px] font-sans font-bold text-[13px] leading-[19.5px] text-[#f59e0b] bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] disabled:opacity-60 transition-colors hover:bg-[rgba(245,158,11,0.14)]"
          >
            {busy ? (
              <Loader2 className="size-[14px] animate-spin" />
            ) : (
              <RotateCcw className="size-[14px]" />
            )}
            Request Revision
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
