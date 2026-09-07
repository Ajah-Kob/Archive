'use client'

import { Loader2 } from 'lucide-react'
import type { ArchivingUiStatus } from '@/lib/actions/archiving'

export interface FooterActionsProps {
  isReadOnly?: boolean
  status?: ArchivingUiStatus
  title?: string
  abstract?: string
  tags?: string[]
  authors?: unknown[]
  documentPresent?: boolean
  isSubmitDisabled?: boolean
  isSubmitting?: boolean
  isSavingDraft?: boolean
  isSaveDraftDisabled?: boolean
  submitDisabledReason?: string
  onPreview: () => void
  onSaveDraft: () => void
  onSubmit: () => void
}

export function FooterActions({
  isReadOnly = false,
  status,
  isSubmitDisabled = false,
  isSubmitting = false,
  isSavingDraft = false,
  isSaveDraftDisabled = false,
  submitDisabledReason,
  onPreview,
  onSaveDraft,
  onSubmit,
}: FooterActionsProps) {
  const showPreviewEnabled = true // always works, even when readOnly
  const submitIsDisabled = isSubmitting || isSubmitDisabled
  const saveDraftIsDisabled = isSavingDraft || Boolean(isSaveDraftDisabled)
  // When readOnly, hide Save Draft and Submit (show only Preview + locked banner handled by parent)
  const hideSaveAndSubmit = Boolean(isReadOnly)

  // Tooltip for disabled submit: explain why disabled
  const submitTitle = submitIsDisabled
    ? submitDisabledReason || 'Please complete all required fields before submitting. Required: title (≤25 words/200 chars), abstract (≤4 sentences/600 chars), at least one tag, at least one valid author (first/last/email), and PDF document.'
    : isSubmitting
      ? 'Submitting…'
      : undefined

  return (
    <div className="border-t border-[#f0f2fa] px-[30px] py-[10px] flex flex-wrap justify-end gap-[10px] shrink-0 bg-white">
      {/* Show Preview — white border #dfe3fb text #5a6382 12.5px bold rounded-9px px18 py8 — always enabled */}
      <button
        type="button"
        onClick={onPreview}
        disabled={!showPreviewEnabled}
        aria-label="Show capstone preview"
        className="inline-flex items-center justify-center h-[33px] px-[18px] py-[8px] rounded-[9px] bg-white border border-[#dfe3fb] font-sans font-bold text-[12.5px] leading-none text-[#5a6382] hover:bg-[#f8f9ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)] focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Show Preview
      </button>

      {!hideSaveAndSubmit ? (
        <>
          {/* Save as Draft — disabled when all fields empty, enabled when at least one input has value */}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saveDraftIsDisabled}
            aria-label="Save as draft"
            title={isSaveDraftDisabled && !isSavingDraft ? 'Add at least one field to save draft' : undefined}
            aria-disabled={saveDraftIsDisabled}
            className={`inline-flex items-center justify-center gap-[6px] h-[33px] px-[18px] py-[8px] rounded-[9px] bg-white border font-sans font-bold text-[12.5px] leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.15)] focus:ring-offset-1 ${
              saveDraftIsDisabled
                ? 'opacity-50 cursor-not-allowed text-[#9ea8c6] border-[#e8ebf8] bg-[#f8f9ff]'
                : 'text-[#5a6382] hover:bg-[#f8f9ff] border-[#dfe3fb]'
            }`}
          >
            {isSavingDraft ? (
              <>
                <Loader2 className="size-[12px] animate-spin" style={{ animationDuration: '1000ms' } as React.CSSProperties} />
                Saving…
              </>
            ) : (
              'Save as Draft'
            )}
          </button>

          {/* Submit Capstone — gradient #707dff 164deg border rgba(112,125,255,0.69) shadow 0_4px_7px rgba(112,125,255,0.19) text white 13px bold px19 py9 rounded-9px */}
          <span className="inline-flex" title={submitTitle}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitIsDisabled}
              aria-label="Submit capstone for review"
              aria-disabled={submitIsDisabled}
              title={submitTitle}
              className={`inline-flex items-center justify-center gap-[8px] h-[36px] px-[19px] py-[9px] rounded-[9px] font-heading font-bold text-[13px] leading-none text-white border shadow-[0px_4px_7px_rgba(112,125,255,0.19)] transition-opacity focus:outline-none focus:ring-2 focus:ring-[rgba(112,125,255,0.3)] focus:ring-offset-1 ${
                submitIsDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95 active:opacity-90 cursor-pointer'
              }`}
              style={{
                background: 'linear-gradient(164deg, #707dff 0%, #5a6bff 100%)',
                borderColor: 'rgba(112,125,255,0.69)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-[13px] animate-spin" style={{ animationDuration: '1000ms' } as React.CSSProperties} />
                  Submitting…
                </>
              ) : (
                'Submit Capstone'
              )}
            </button>
          </span>
        </>
      ) : (
        // Read-only footer hint: keep layout stable with a subtle locked note when Save/Submit hidden
        <span className="inline-flex items-center h-[33px] px-[12px] rounded-[9px] bg-[#fffbeb] border border-[#f59e0b]/30 font-sans font-medium text-[12px] leading-none text-[#92400e] hidden sm:inline-flex">
          {status === 'CAPSTONE_ARCHIVED' ? 'Archived — view in Repository' : 'Submission locked'}
        </span>
      )}
    </div>
  )
}

export default FooterActions
