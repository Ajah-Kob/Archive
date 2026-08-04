'use client'

import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { removeSection } from '@/lib/actions/sections'
import type { MySectionCardData } from '@/lib/actions/sections'

interface RemoveSectionModalProps {
  section: MySectionCardData | null
  onClose: () => void
  onSuccess: () => void
}

export function RemoveSectionModal({
  section,
  onClose,
  onSuccess,
}: RemoveSectionModalProps) {
  if (!section) return null

  async function handleConfirm() {
    const result = await removeSection(section.id)
    if (result.success) {
      toast.success(`Section ${section.name} removed.`)
      onSuccess()
    } else {
      toast.error(result.message)
    }
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,18,40,0.45)] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Remove Section</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Are you sure you want to remove section &quot;{section.name}&quot;?
              This action can be undone by an administrator.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-95 bg-red-500 hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
