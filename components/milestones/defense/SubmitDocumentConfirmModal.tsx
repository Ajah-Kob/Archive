'use client'

import { useEffect } from 'react'
import { FileText, Loader2, RefreshCw, Send, X } from 'lucide-react'

interface SubmitDocumentConfirmModalProps {
  /** Which action is being confirmed — submit or replace. */
  mode: 'submit' | 'replace'
  /** Name of the document being submitted/replaced. */
  fileName: string
  /** True while the submission/replacement is in flight. */
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Confirmation modal shown before a defense document is submitted or replaced.
 *
 * Asks the user to confirm they want to submit the uploaded document for panel
 * review, or replace an already-submitted document. Matches the app's
 * confirmation-modal pattern (backdrop, Escape to close, Cancel/Confirm
 * actions) with a neutral indigo accent — submitting/replacing a document is a
 * confirmatory action, not a destructive one.
 */
export function SubmitDocumentConfirmModal({
  mode,
  fileName,
  busy,
  onConfirm,
  onClose,
}: SubmitDocumentConfirmModalProps) {
  const isReplace = mode === 'replace'

  // Close on Escape while open (matches VerdictConfirmModal / drawers).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-document-confirm-title"
        className="w-full max-w-[440px] bg-white border border-[#eceef8] rounded-[16px] shadow-[0_16px_48px_rgba(16,19,58,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-[16px] px-6 pt-5 pb-4 border-b border-[#eceef8]">
          <div>
            <h3
              id="submit-document-confirm-title"
              className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]"
            >
              {isReplace ? 'Replace Document' : 'Submit Document'}
            </h3>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              {isReplace
                ? 'Confirm before replacing your submitted document.'
                : 'Confirm before sending your document for panel review.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-60"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-[16px]">
          {/* Document being submitted */}
          <div className="flex items-center gap-[11px] px-[14px] py-[12px] rounded-[10px] bg-[#fafbff] border border-[#eceef8]">
            <div className="flex size-[36px] items-center justify-center rounded-[9px] bg-[rgba(112,125,255,0.07)] border border-[rgba(112,125,255,0.14)] shrink-0">
              <FileText className="size-[16px] text-[#707dff]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a]">
                {fileName}
              </p>
              <p className="pt-[2px] font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
                PDF · Ready to {isReplace ? 'replace' : 'submit'}
              </p>
            </div>
          </div>

          <div className="bg-[#f8f9ff] border border-[#eef0fb] rounded-[9px] px-[14px] py-[12px]">
            <p className="font-sans font-medium text-[12.5px] leading-[19px] text-[#3d4566]">
              {isReplace
                ? 'Are you sure you want to replace your submitted document? The previous file will be permanently deleted.'
                : 'Are you sure you want to submit this document? Once submitted, it will be sent to your panel for review.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-[8px] px-6 py-4 border-t border-[#eceef8] bg-[#fafbff] rounded-b-[16px]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-[32px] px-[12px] rounded-[8px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center justify-center gap-[6px] h-[36px] px-[16px] rounded-[9px] font-sans font-bold text-[12px] text-white transition-opacity hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 outline-none focus-visible:ring-[rgba(112,125,255,0.4)]"
            style={{
              backgroundImage: 'linear-gradient(159deg, #707dff 0%, #5565ff 100%)',
            }}
          >
            {busy ? (
              <Loader2 className="size-[13px] animate-spin" />
            ) : isReplace ? (
              <RefreshCw className="size-[13px]" />
            ) : (
              <Send className="size-[13px]" />
            )}
            {busy
              ? isReplace
                ? 'Replacing…'
                : 'Submitting…'
              : isReplace
                ? 'Yes, Replace'
                : 'Yes, Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

