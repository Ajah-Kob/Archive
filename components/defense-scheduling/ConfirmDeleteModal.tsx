'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { deleteDefenseSchedule } from '@/lib/actions/defense'

/**
 * Minimal schedule info needed to label the deletion target. The parent page
 * builds this from the row it holds, so the modal stays decoupled from the
 * full DefenseSchedulePayload shape.
 */
export interface DefenseScheduleSummary {
  id: number
  groupName: string
  /** Defense date — ISO string or an already-localized label. */
  date: string
}

interface ConfirmDeleteModalProps {
  /** Controlled open state — the parent decides when this modal shows. */
  open: boolean
  /** The schedule being deleted; null renders nothing. */
  schedule: DefenseScheduleSummary | null
  /** Closes the modal (called on ESC, backdrop click, Cancel, and success). */
  onClose: () => void
  /** Success hook so the parent can refresh its schedule list. */
  onConfirmed?: () => void
}

/** Renders an ISO date as a human label; falls back to the raw string. */
function formatDateLabel(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/* ----------------------------------------------------------------------------
 * Compound pieces — module level so nothing is re-created per render.
 * ------------------------------------------------------------------------- */

function WarningBadge() {
  return (
    <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50">
      <AlertTriangle className="size-6 text-red-500" strokeWidth={2} />
    </div>
  )
}

function CloseButton({
  disabled,
  onClose,
}: {
  disabled: boolean
  onClose: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      disabled={disabled}
      aria-label="Close"
      className="absolute top-4 right-4 flex size-[28px] items-center justify-center rounded-[10px] border border-[#e8ebf8] bg-white text-[#8a93b4] hover:bg-gray-50 hover:text-[#5a6382] transition-colors disabled:opacity-60"
    >
      <X className="size-[15px]" />
    </button>
  )
}

function CancelButton({
  disabled,
  onClose,
}: {
  disabled: boolean
  onClose: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      disabled={disabled}
      className="flex-1 rounded-[10px] border border-[#e8ebf8] bg-[#fafbff] py-[11px] font-sans font-semibold text-[13px] text-[#5a6382] hover:border-[#dddff0] hover:bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      Cancel
    </button>
  )
}

function DeleteButton({
  isPending,
  onConfirm,
}: {
  isPending: boolean
  onConfirm: () => void
}) {
  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={isPending}
      className="flex flex-1 items-center justify-center gap-[8px] rounded-[10px] bg-red-500 py-[11px] font-sans font-semibold text-[13px] text-white shadow-[0px_4px_14px_0px_rgba(254,111,111,0.3)] hover:bg-red-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 className="size-[14px] animate-spin" />
      ) : (
        <Trash2 className="size-[14px]" />
      )}
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}

/**
 * Confirmation modal for deleting a defense schedule.
 *
 * Own schedule rows pass an id, group name, and date. Confirm calls
 * `deleteDefenseSchedule(id)` directly, toasts the outcome, and closes on
 * success (parent state controls `open`/`schedule`).
 */
export function ConfirmDeleteModal({
  open,
  schedule,
  onClose,
  onConfirmed,
}: ConfirmDeleteModalProps) {
  const [isPending, setIsPending] = useState(false)

  // Close on ESC while open and not busy (same as the evaluation modals).
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isPending, onClose])

  async function handleConfirm() {
    if (!schedule) return
    setIsPending(true)
    try {
      const result = await deleteDefenseSchedule(schedule.id)
      if (result.success) {
        toast.success('Defense schedule deleted')
        onConfirmed?.()
        onClose()
        return
      }
      toast.error(result.message)
    } catch (error) {
      console.error('[ConfirmDeleteModal] deleteDefenseSchedule failed:', error)
      toast.error('Failed to delete defense schedule.')
    } finally {
      setIsPending(false)
    }
  }

  if (!open || !schedule) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[4px]"
      onClick={() => {
        if (!isPending) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        className="relative flex w-full max-w-md flex-col items-center rounded-2xl bg-white p-6 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <CloseButton disabled={isPending} onClose={onClose} />

        <WarningBadge />

        <h3
          id="confirm-delete-title"
          className="pt-[16px] font-heading text-[17px] leading-[25.5px] font-bold tracking-[-0.17px] text-[#10133a]"
        >
          Delete Defense Schedule?
        </h3>
        <p className="pt-[8px] font-sans text-[13px] leading-[20.15px] font-medium text-[#8a93b4]">
          This will permanently delete the defense schedule for{' '}
          <span className="font-semibold text-[#3d4566]">
            {schedule.groupName}
          </span>{' '}
          on{' '}
          <span className="font-semibold text-[#3d4566]">
            {formatDateLabel(schedule.date)}
          </span>
          . This action cannot be undone.
        </p>

        <div className="flex w-full items-center gap-[10px] pt-[20px]">
          <CancelButton disabled={isPending} onClose={onClose} />
          <DeleteButton isPending={isPending} onConfirm={handleConfirm} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
