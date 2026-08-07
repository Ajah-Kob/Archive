'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ClipboardEdit, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { reviewTopic, type PendingTopic } from '@/lib/actions/sections'

interface TopicReviewModalProps {
  topic: PendingTopic | null
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TopicReviewModal({ topic, onClose }: TopicReviewModalProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'APPROVED' | 'NEED_REVISION' | null>(null)

  useEffect(() => {
    setNote('')
    setBusy(null)
  }, [topic?.id])

  async function submit(decision: 'APPROVED' | 'NEED_REVISION') {
    if (!topic) return
    setBusy(decision)
    const res = await reviewTopic(topic.id, decision, note)
    setBusy(null)
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
            <div className="size-[30px] rounded-[8px] bg-[rgba(112,125,255,0.05)] flex items-center justify-center">
              <ClipboardEdit className="size-[14px] text-[#707dff]" />
            </div>
            <h2 className="font-['Sora',sans-serif] font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
              Review Topic
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy != null}
            className="size-[28px] rounded-[7px] bg-[#f4f5fc] border border-[#e8ebf8] flex items-center justify-center cursor-pointer hover:bg-[#eef0fb] transition-colors"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <div className="px-[22px] py-[20px] flex flex-col gap-[16px] overflow-y-auto">
          <div className="flex flex-col gap-[6px]">
            <p className="font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
              {topic.groupName} · submitted by {topic.submittedBy || 'Unknown'} ·{' '}
              {formatDate(topic.createdAt)}
            </p>
            <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#10133a] tracking-[-0.16px]">
              {topic.title}
            </h3>
          </div>

          <div className="bg-[#fafbff] border border-[#eceef8] rounded-[10px] px-[14px] py-[12px]">
            <p className="font-sans font-semibold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6] pb-[6px]">
              Background
            </p>
            <p className="font-sans font-medium text-[13px] leading-[20.15px] text-[#3d4566] whitespace-pre-wrap">
              {topic.background}
            </p>
          </div>

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
            onClick={() => submit('NEED_REVISION')}
            disabled={busy != null}
            className="flex gap-[6px] items-center px-[16px] py-[9px] rounded-[10px] font-sans font-bold text-[13px] leading-[19.5px] text-[#f59e0b] bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] disabled:opacity-60 transition-colors hover:bg-[rgba(245,158,11,0.14)]"
          >
            {busy === 'NEED_REVISION' ? (
              <Loader2 className="size-[14px] animate-spin" />
            ) : (
              <ClipboardEdit className="size-[14px]" />
            )}
            Request Revision
          </button>
          <button
            type="button"
            onClick={() => submit('APPROVED')}
            disabled={busy != null}
            className="flex gap-[6px] items-center px-[18px] py-[9px] rounded-[10px] font-sans font-bold text-[13px] leading-[19.5px] text-white disabled:opacity-60 transition-opacity"
            style={{
              backgroundImage: 'linear-gradient(163.7deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: '0px 4px 6px rgba(34,197,94,0.25)',
            }}
          >
            {busy === 'APPROVED' ? (
              <Loader2 className="size-[14px] animate-spin" />
            ) : (
              <CheckCircle2 className="size-[14px]" />
            )}
            Approve
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
