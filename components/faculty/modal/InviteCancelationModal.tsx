'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'

interface InviteCancelationModalProps {
  isOpen: boolean
  facultyName: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function InviteCancelationModal({
  isOpen,
  facultyName,
  onConfirm,
  onCancel,
  isLoading = false,
}: InviteCancelationModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    if (!isOpen) return

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    dialogRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      onCancelRef.current()
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-xl w-[380px] p-6 flex flex-col gap-5"
      >
        <div className="flex items-center justify-between">
          <h2
            id={titleId}
            className="text-blue-900 text-sm font-bold font-['Sora'] leading-5"
          >
            Cancel Invitation
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close cancel invitation dialog"
            className="size-6 flex items-center justify-center rounded-full hover:bg-slate-100"
          >
            <X className="size-4 text-slate-500" />
          </button>
        </div>
        <p className="text-slate-600 text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5">
          Are you sure you want to cancel the invitation for{' '}
          <span className="font-bold text-slate-800">{facultyName}</span>?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#e8ebf8] bg-white text-slate-600 text-sm font-bold font-['Plus_Jakarta_Sans'] hover:bg-slate-50 transition-colors"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold font-['Plus_Jakarta_Sans'] hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="size-4 text-white animate-spin mx-auto" />
            ) : (
              'Yes, Cancel'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
