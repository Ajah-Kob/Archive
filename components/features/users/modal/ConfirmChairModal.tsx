'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { X, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { toggleProgramChair } from '@/lib/actions/faculty'
import type { UserItem } from '@/components/features/users/main/UsersTable'

interface ConfirmChairModalProps {
  user: UserItem | null
  onClose: () => void
  onSuccess?: () => void
}

export default function ConfirmChairModal({
  user,
  onClose,
  onSuccess,
}: ConfirmChairModalProps) {
  const [isPending, setIsPending] = React.useState(false)

  const handleConfirm = async () => {
    if (!user) return
    setIsPending(true)
    const res = await toggleProgramChair(user.id)
    setIsPending(false)
    if (res.success) {
      toast.success(res.message)
      onSuccess?.()
    } else {
      toast.error(res.message)
    }
    onClose()
  }

  if (!user) return null

  const isSetting = !user.isProgramChair

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-500">
            <Crown size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isSetting ? 'Set as Chair' : 'Remove as Chair'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Are you sure you want to {isSetting ? 'set' : 'remove'}{' '}
              <strong>{user.name}</strong> {isSetting ? 'as' : 'as'} the Program
              Chair?
              {isSetting && ' Only one faculty member can be chair at a time.'}
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
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-95 disabled:active:scale-100 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300"
          >
            {isPending ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
