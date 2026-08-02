'use client'

import { createPortal } from 'react-dom'
import { X, Loader2, Trash2 } from 'lucide-react'

interface RemoveFacultyModalProps {
  isOpen: boolean
  memberName: string
  memberEmail: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function RemoveFacultyModal({
  isOpen,
  memberName,
  memberEmail,
  onConfirm,
  onCancel,
  isLoading = false,
}: RemoveFacultyModalProps) {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div className="bg-white rounded-[16px] w-[380px] p-[24px] flex flex-col gap-[20px] shadow-[0_20px_60px_rgba(112,125,255,0.18),0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <span className="font-heading font-bold text-[16px] leading-[24px] text-[#10133a]">
            Remove Faculty
          </span>
          <button
            onClick={onCancel}
            className="flex justify-center items-center size-7 bg-violet-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-violet-100"
          >
            <X className="size-4 text-slate-400" />
          </button>
        </div>

        <div className="flex gap-[12px] items-center bg-[#f8f9fe] border border-[#eceef8] rounded-[12px] px-[16px] py-[12px]">
          <div className="flex justify-center items-center size-9 rounded-full bg-[#707dff] shrink-0">
            <span className="font-heading font-bold text-[12px] leading-[18px] text-white tracking-[0.3456px]">
              {memberName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <p className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145] truncate">
              {memberName}
            </p>
            <p className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4] truncate">
              {memberEmail}
            </p>
          </div>
        </div>

        <p className="font-sans font-medium text-[13px] leading-[21.45px] text-[#5a6382]">
          Are you sure you want to remove{' '}
          <span className="font-bold text-[#1e2145]">{memberName}</span> from the
          faculty list? This action cannot be undone.
        </p>

        <div className="flex gap-[10px] justify-end">
          <button
            onClick={onCancel}
            className="px-[19px] py-[10px] rounded-[9px] bg-[#f0f2fa] border border-[#dddff0] font-sans font-semibold text-[13px] leading-[19.5px] text-[#5a6382] hover:bg-[#e9ebf6] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex gap-[7px] items-center px-[19px] py-[10px] rounded-[9px] bg-[#ef4444] border border-red-400 font-sans font-bold text-[13px] leading-[19.5px] text-white shadow-[0_2px_8px_rgba(239,68,68,0.35)] hover:bg-[#dc2626] transition-colors disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Remove Faculty
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
