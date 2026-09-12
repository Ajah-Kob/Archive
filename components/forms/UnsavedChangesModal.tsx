'use client'

import { createPortal } from 'react-dom'
import { Save, X } from 'lucide-react'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onSave: () => void
  onDiscard: () => void
  onClose: () => void
}

export function UnsavedChangesModal({
  isOpen,
  onSave,
  onDiscard,
  onClose,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] p-4">
      <div className="w-[400px] max-w-full rounded-[16px] border border-[#eceef8] bg-white p-[24px] shadow-[0_20px_60px_rgba(112,125,255,0.18),0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <span className="font-heading text-[16px] font-bold leading-[24px] text-[#10133a]">
            Unsaved changes
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stay on this page"
            className="flex size-7 items-center justify-center rounded-lg bg-violet-50 outline outline-1 outline-offset-[-1px] outline-violet-100 transition-colors hover:bg-violet-100"
          >
            <X className="size-4 text-slate-400" />
          </button>
        </div>

        <p className="pt-[12px] font-sans text-[13px] font-medium leading-[20px] text-[#5a6382]">
          You have unsaved changes. Save them before leaving, or discard them.
        </p>

        <div className="flex justify-end gap-[10px] pt-[20px]">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-[9px] border border-[#dddff0] bg-[#f0f2fa] px-[19px] py-[10px] font-sans text-[13px] font-semibold leading-[19.5px] text-[#5a6382] transition-colors hover:bg-[#e9ebf6]"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-[7px] rounded-[9px] border border-[#707dff] bg-[#707dff] px-[19px] py-[10px] font-sans text-[13px] font-bold leading-[19.5px] text-white shadow-[0_2px_8px_rgba(112,125,255,0.35)] transition-colors hover:bg-[#5a67ff]"
          >
            <Save className="size-4" />
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
