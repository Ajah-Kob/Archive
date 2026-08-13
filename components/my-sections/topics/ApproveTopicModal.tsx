'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { reviewTopic, type PendingTopic } from '@/lib/actions/sections'
import { TopicInfoBox } from './TopicInfoBox'

interface ApproveTopicModalProps {
  topic: PendingTopic | null
  onClose: () => void
}

export function ApproveTopicModal({ topic, onClose }: ApproveTopicModalProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setBusy(false)
  }, [topic?.id])

  async function submit() {
    if (!topic) return
    setBusy(true)
    const res = await reviewTopic(topic.id, 'APPROVED')
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
            <div className="size-[30px] rounded-[8px] bg-[rgba(34,197,94,0.08)] flex items-center justify-center">
              <CheckCircle2 className="size-[14px] text-[#16a34a]" />
            </div>
            <h2 className="font-['Sora',sans-serif] font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
              Approve Topic
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

        <div className="px-[22px] py-[20px] flex flex-col gap-[16px]">
          <p className="font-['Sora',sans-serif] font-bold text-[16px] leading-[24px] text-[#1e2145] tracking-[-0.16px]">
            Are you sure you want to approve this topic?
          </p>

          <TopicInfoBox
            groupName={topic.groupName}
            title={topic.title}
            background={topic.background}
          />
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
            className="flex gap-[6px] items-center px-[18px] py-[9px] rounded-[10px] font-sans font-bold text-[13px] leading-[19.5px] text-white disabled:opacity-60 transition-opacity"
            style={{
              backgroundImage: 'linear-gradient(163.7deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: '0px 4px 6px rgba(34,197,94,0.25)',
            }}
          >
            {busy ? (
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
