'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'

interface InviteConfirmationModalProps {
  isOpen: boolean
  facultyName: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function InviteConfirmationModal({
  isOpen,
  facultyName,
  onConfirm,
  onCancel,
  isLoading = false,
}: InviteConfirmationModalProps) {
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
            Invite Faculty
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close invite faculty dialog"
            className="size-6 flex items-center justify-center rounded-full hover:bg-slate-100"
          >
            <X className="size-4 text-slate-500" />
          </button>
        </div>
        <p className="text-slate-600 text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5">
          Are you sure you want to invite{' '}
          <span className="font-bold text-slate-800">{facultyName}</span>{' '}
          as a coordinator?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#e8ebf8] bg-white text-slate-600 text-sm font-bold font-['Plus_Jakarta_Sans'] hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-white text-sm font-bold font-['Plus_Jakarta_Sans'] disabled:opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(156.329deg, rgb(112, 125, 255) 0%, rgb(85, 101, 255) 100%)',
            }}
          >
            {isLoading ? (
              <Loader2 className="size-4 text-white animate-spin mx-auto" />
            ) : (
              'Invite Faculty'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
