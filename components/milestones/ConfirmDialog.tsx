'use client'

import { Loader2, TriangleAlert } from 'lucide-react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div className="relative bg-white border border-[#eceef8] rounded-[16px] w-[400px] px-[24px] pt-[26px] pb-[22px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col items-center">
        <div className="size-[52px] rounded-[16px] bg-[rgba(254,111,111,0.08)] flex items-center justify-center">
          <TriangleAlert className="size-6 text-[#e85555]" strokeWidth={2} />
        </div>

        <p className="font-heading font-bold text-[16px] leading-[24px] text-[#12143a] tracking-[-0.16px] pt-[16px]">
          {title}
        </p>
        <p className="font-sans font-medium text-[13px] leading-[20.15px] text-[#8a93b4] text-center pt-[8px]">
          {message}
        </p>

        <div className="flex gap-[10px] items-center w-full pt-[20px]">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 bg-white border border-[#dddff0] rounded-[9px] py-[11px] text-center font-semibold text-[13.5px] text-[#5a6382] hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-[8px] rounded-[9px] py-[11px] text-[13.5px] font-semibold text-white bg-gradient-to-br from-[#fe6f6f] to-[#e85555] shadow-[0px_4px_14px_0px_rgba(254,111,111,0.3)] disabled:opacity-60 transition-opacity"
          >
            {busy ? (
              <Loader2 className="size-[14px] animate-spin" />
            ) : (
              <TriangleAlert className="size-[14px]" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
