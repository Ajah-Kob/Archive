'use client'

import { createPortal } from 'react-dom'
import { X, Loader2, Lock, Unlock } from 'lucide-react'

interface MilestoneConfirmModalProps {
  isOpen: boolean
  milestoneLabel: string
  willOpen: boolean
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function MilestoneConfirmModal({
  isOpen,
  milestoneLabel,
  willOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: MilestoneConfirmModalProps) {
  if (!isOpen) return null

  const isUnlock = willOpen

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] p-4">
      <div className="bg-white rounded-[16px] w-[400px] max-w-full p-[24px] flex flex-col gap-[20px] shadow-[0_20px_60px_rgba(112,125,255,0.18),0_2px_8px_rgba(0,0,0,0.06)] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <span className="font-heading font-bold text-[16px] leading-[24px] text-[#10133a]">
            {isUnlock ? 'Unlock Milestone' : 'Lock Milestone'}
          </span>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex justify-center items-center size-7 bg-violet-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-violet-100 hover:bg-violet-100 transition-colors disabled:opacity-50"
          >
            <X className="size-4 text-slate-400" />
          </button>
        </div>

        <div className="flex gap-[14px] items-start">
          <div
            className={`flex justify-center items-center size-10 rounded-[12px] shrink-0 ${isUnlock ? 'bg-[#f0f0ff] text-[#707dff] border border-[#e0e3ff]' : 'bg-[#fff7ed] text-[#f59e0b] border border-[#fde4c8]'}`}
          >
            {isUnlock ? <Unlock className="size-5" /> : <Lock className="size-5" />}
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <p className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">{milestoneLabel}</p>
            <p className="font-sans font-medium text-[13px] leading-[20px] text-[#5a6382]">
              {isUnlock ? (
                <>
                  Students in this section will be able to submit and view <span className="font-bold text-[#1e2145]">{milestoneLabel}</span>. You can lock it again anytime.
                </>
              ) : (
                <>
                  Students will no longer see <span className="font-bold text-[#1e2145]">{milestoneLabel}</span> in their journey. In-progress submissions stay saved but become locked.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-[10px] justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-[19px] py-[10px] rounded-[9px] bg-[#f0f2fa] border border-[#dddff0] font-sans font-semibold text-[13px] leading-[19.5px] text-[#5a6382] hover:bg-[#e9ebf6] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex gap-[7px] items-center px-[19px] py-[10px] rounded-[9px] font-sans font-bold text-[13px] leading-[19.5px] text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-colors disabled:opacity-60 ${isUnlock ? 'bg-[#707dff] border border-[#707dff] hover:bg-[#5a67ff]' : 'bg-[#f59e0b] border border-[#f59e0b] hover:bg-[#e08800] shadow-[0_2px_8px_rgba(245,158,11,0.25)]'}`}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : isUnlock ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            {isUnlock ? 'Unlock' : 'Lock'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
