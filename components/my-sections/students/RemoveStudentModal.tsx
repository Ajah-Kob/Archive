'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { removeStudentsFromSection } from '@/lib/actions/sections'
import type { StudentData } from '@/components/sections/students/StudentDataRow'

interface RemoveStudentModalProps {
  students: StudentData[]
  onClose: () => void
  onSuccess: () => void
}

const VISIBLE_NAMES = 5

export function RemoveStudentModal({
  students,
  onClose,
  onSuccess,
}: RemoveStudentModalProps) {
  const [isPending, setIsPending] = useState(false)
  if (students.length === 0) return null

  const count = students.length
  const shown = students.slice(0, VISIBLE_NAMES)
  const hiddenCount = count - shown.length

  async function handleConfirm() {
    if (isPending) return
    setIsPending(true)
    const result = await removeStudentsFromSection(students.map((s) => s.id))
    setIsPending(false)
    if (result.success) {
      toast.success(
        count === 1
          ? `${students[0].name} was removed from the section.`
          : `${count} students were removed from the section.`,
      )
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
          disabled={isPending}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Remove {count === 1 ? 'Student' : `${count} Students`}
            </h3>
            <div className="mt-2 flex flex-col gap-1 max-w-xs max-h-[120px] overflow-y-auto">
              {shown.map((s) => (
                <p key={s.id} className="text-xs font-semibold text-slate-700 truncate">
                  {s.name}
                </p>
              ))}
              {hiddenCount > 0 && (
                <p className="text-xs text-slate-500">+{hiddenCount} more</p>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 max-w-xs">
              {count === 1
                ? 'This student will be removed from their group (if any) and from this section. Their user account will be kept.'
                : 'These students will be removed from their groups (if any) and from this section. Their user accounts will be kept.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-95 bg-red-500 hover:bg-red-600 disabled:opacity-60"
          >
            {isPending ? 'Removing…' : `Remove${count > 1 ? ` ${count}` : ''}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
