'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  Highlighter,
  Loader2,
  Pen,
  RotateCcw,
  StickyNote,
  Strikethrough,
  Type,
  X,
} from 'lucide-react'
import { reviewSubmission } from '@/lib/actions/evaluation'
import { commitAnnotations } from '@/lib/actions/annotations'

/**
 * Annotation counts per tool type, keyed by tool id (matches the ids used in
 * AnnotationToolbar). The workspace orchestrator computes this from the
 * serialized annotation items before opening the modal.
 */
export type AnnotationSummary = Record<string, number>

const SUMMARY_ROWS: ReadonlyArray<{
  key: string
  label: string
  icon: typeof Highlighter
}> = [
  { key: 'highlight', label: 'Highlights', icon: Highlighter },
  { key: 'text', label: 'Sticky notes', icon: StickyNote },
  { key: 'ink', label: 'Ink pen', icon: Pen },
  { key: 'freeText', label: 'Free text', icon: Type },
  { key: 'strikeout', label: 'Strikeouts', icon: Strikethrough },
]

/** Shown when the verdict succeeded but the annotation commit did not. */
const COMMIT_FAILED_WARNING =
  'Your verdict was saved, but your annotations could not be committed. The draft will be committed on a later visit.'

interface VerdictConfirmModalProps {
  /** MilestoneSubmission id being reviewed. */
  submissionId: number
  /** The verdict being confirmed. */
  decision: 'APPROVED' | 'NEED_REVISION'
  /** Annotation counts per tool type ({ highlight, text, ink, freeText, strikeout }). */
  annotationSummary?: AnnotationSummary
  /**
   * Serialized AnnotationTransferItem[] (from serializeAnnotations) to commit
   * as a follow-up. Null when there is no draft — the commit is skipped.
   */
  annotationData: unknown | null
  onClose: () => void
  /** Fired once the verdict is recorded (after the commit attempt), so the parent can refresh/navigate. */
  onCommitted: () => void
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans font-extrabold text-[10px] leading-[15px] tracking-[0.9px] uppercase text-[#bbc0d8]">
      {children}
    </p>
  )
}

/**
 * Confirmation modal for the workspace verdict flow (design spec 6.4 / 7).
 *
 * Shows the annotation summary (count per type). On confirm:
 *
 *   1. `reviewSubmission(submissionId, decision, null)` first — this records
 *      the verdict. A failure keeps the modal open with an error toast.
 *   2. On success, `commitAnnotations(submissionId, data)` runs as a separate
 *      follow-up. A failed commit does NOT block the verdict: the row stays
 *      DRAFT and the modal closes with a warning toast — the draft can be
 *      committed on a later visit.
 */
export function VerdictConfirmModal({
  submissionId,
  decision,
  annotationSummary = {},
  annotationData,
  onClose,
  onCommitted,
}: VerdictConfirmModalProps) {
  const [busy, setBusy] = useState(false)

  const isRevision = decision === 'NEED_REVISION'
  const totalCount = SUMMARY_ROWS.reduce(
    (sum, row) => sum + (annotationSummary[row.key] ?? 0),
    0,
  )

  // Close on Escape while open (matches DetailPanel/VersionDrawer behavior).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  async function confirm() {
    setBusy(true)

    // 1. Record the verdict first — this is the source of truth.
    let review
    try {
      review = await reviewSubmission(submissionId, decision, null)
    } catch (error) {
      console.error('[VerdictConfirmModal] reviewSubmission failed:', error)
      setBusy(false)
      toast.error('Failed to submit the verdict. Please try again.')
      return
    }

    if (!review.success) {
      setBusy(false)
      toast.error(review.message)
      return
    }
    toast.success(review.message)

    // 2. Follow-up commit — a failure must not block the verdict. The row
    // stays DRAFT and can be committed on a later visit.
    const hasData =
      annotationData != null &&
      !(Array.isArray(annotationData) && annotationData.length === 0)
    if (hasData) {
      try {
        const commit = await commitAnnotations(submissionId, annotationData)
        if (!commit.success) toast.warning(COMMIT_FAILED_WARNING)
      } catch (error) {
        console.error('[VerdictConfirmModal] commitAnnotations failed:', error)
        toast.warning(COMMIT_FAILED_WARNING)
      }
    }

    setBusy(false)
    onCommitted()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verdict-confirm-title"
        className="w-full max-w-[440px] bg-white border border-[#eceef8] rounded-[16px] shadow-[0_16px_48px_rgba(16,19,58,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px] px-6 pt-5 pb-4 border-b border-[#eceef8]">
          <div>
            <h3
              id="verdict-confirm-title"
              className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]"
            >
              {isRevision ? 'Request Revisions' : 'Approve Submission'}
            </h3>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              {isRevision
                ? 'The group will be asked to revise the document based on your feedback.'
                : 'The group will be notified that this submission is approved.'}
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

        <div className="px-6 py-5 flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[10px]">
            <SectionHeading>Annotation Summary</SectionHeading>
            {totalCount === 0 ? (
              <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#9ea8c6]">
                No annotations were made on this document.
              </p>
            ) : (
              <div className="border border-[#eceef8] rounded-[9px] divide-y divide-[#f4f5fc]">
                {SUMMARY_ROWS.map(({ key, label, icon: Icon }) => {
                  const count = annotationSummary[key] ?? 0
                  if (count === 0) return null
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-[8px] px-[14px] py-[9px]"
                    >
                      <Icon
                        className="size-[13px] text-[#9ea8c6] shrink-0"
                        strokeWidth={1.75}
                      />
                      <span className="flex-1 font-sans font-medium text-[12.5px] leading-[18.75px] text-[#3d4566]">
                        {label}
                      </span>
                      <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10.5px] text-[#707dff]">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-[#f8f9ff] border border-[#eef0fb] rounded-[9px] px-[14px] py-[12px]">
            <p className="font-sans font-medium text-[12.5px] leading-[19px] text-[#3d4566]">
              {isRevision
                ? 'Are you sure you want to request a revision? Your annotations on this document will be saved.'
                : 'Are you sure you want to approve this document? Your annotations on this document will be saved.'}
            </p>
          </div>
        </div>

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
            onClick={confirm}
            disabled={busy}
            className={`flex items-center justify-center gap-[6px] h-[36px] px-[16px] rounded-[9px] font-sans font-bold text-[12px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 outline-none ${
              isRevision
                ? 'bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.14)] focus-visible:ring-[rgba(245,158,11,0.4)]'
                : 'bg-[#16a34a] text-white hover:bg-[#15803d] focus-visible:ring-[rgba(22,163,74,0.4)]'
            }`}
          >
            {busy ? (
              <Loader2 className="size-[13px] animate-spin" />
            ) : isRevision ? (
              <RotateCcw className="size-[13px]" />
            ) : (
              <Check className="size-[13px]" strokeWidth={2.5} />
            )}
            {isRevision ? 'Yes, Request Revision' : 'Yes, Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
