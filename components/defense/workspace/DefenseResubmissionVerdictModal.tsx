'use client'

import { createContext, use, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2, RotateCcw, X } from 'lucide-react'
import { reviewDefenseResubmission } from '@/lib/actions/defense'

export type DefenseResubmissionSummary = Record<string, number>

interface DefenseResubmissionVerdictModalProps {
  submissionId: number
  scheduleId?: number
  decision: 'APPROVED' | 'REJECTED'
  annotationSummary?: DefenseResubmissionSummary
  annotationData: unknown | null
  onClose: () => void
  onCommitted: () => void
}

interface DefenseResubmissionVerdictContextValue {
  submissionId: number
  decision: 'APPROVED' | 'REJECTED'
  annotationSummary: DefenseResubmissionSummary
  annotationData: unknown | null
  busy: boolean
  hasAnnotations: boolean
  onClose: () => void
  confirm: () => Promise<void>
}

const DefenseResubmissionVerdictContext = createContext<DefenseResubmissionVerdictContextValue | null>(null)

function useDefenseResubmissionVerdict(): DefenseResubmissionVerdictContextValue {
  const ctx = use(DefenseResubmissionVerdictContext)
  if (!ctx) throw new Error('DefenseResubmissionVerdict must be within Provider')
  return ctx
}

function getTotalCount(summary: DefenseResubmissionSummary): number {
  return Object.values(summary).reduce((sum, v) => sum + (v ?? 0), 0)
}

export function DefenseResubmissionVerdictModal(props: DefenseResubmissionVerdictModalProps) {
  return (
    <DefenseResubmissionVerdictProvider {...props}>
      <DefenseResubmissionVerdictDialog />
    </DefenseResubmissionVerdictProvider>
  )
}

function DefenseResubmissionVerdictProvider({
  submissionId,
  scheduleId,
  decision,
  annotationSummary = {},
  annotationData,
  onClose,
  onCommitted,
  children,
}: DefenseResubmissionVerdictModalProps & { children: React.ReactNode }) {
  const [busy, setBusy] = useState(false)
  const totalCount = getTotalCount(annotationSummary)
  const hasAnnotations = totalCount > 0

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  async function confirm() {
    if (busy) return
    // Request Revision requires at least one annotation (like evaluation)
    if (decision === 'REJECTED' && !hasAnnotations) {
      toast.error('Add at least one annotation before requesting revision.')
      return
    }
    setBusy(true)
    try {
      const payload = annotationData ?? []
      const result = await reviewDefenseResubmission(submissionId, decision, payload)
      if (!result.success) {
        toast.error(result.message || 'Failed to submit review.')
        setBusy(false)
        return
      }
      toast.success(result.message || (decision === 'APPROVED' ? 'Resubmission approved.' : 'Revision requested.'))
      onCommitted()
      onClose()
      return
    } catch (error) {
      console.error('[DefenseResubmissionVerdictModal] review failed:', error)
      toast.error('Failed to submit review. Please try again.')
      setBusy(false)
      return
    }
  }

  return (
    <DefenseResubmissionVerdictContext
      value={{
        submissionId,
        decision,
        annotationSummary,
        annotationData,
        busy,
        hasAnnotations,
        onClose,
        confirm,
      }}
    >
      {children}
    </DefenseResubmissionVerdictContext>
  )
}

function DefenseResubmissionVerdictDialog() {
  const { busy, decision, onClose, confirm, hasAnnotations } = useDefenseResubmissionVerdict()
  const isApprove = decision === 'APPROVED'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[440px] bg-white border border-[#eceef8] rounded-[16px] shadow-[0_16px_48px_rgba(16,19,58,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[16px] px-6 pt-5 pb-4 border-b border-[#eceef8]">
          <div>
            <h3 className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]">
              {isApprove ? 'Approve resubmission' : 'Request revision'}
            </h3>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              {isApprove ? 'This will mark the resubmission as approved.' : 'Your annotations will be sent as revision feedback.'}
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
          <div className="bg-[#f8f9ff] border border-[#eef0fb] rounded-[9px] px-[14px] py-[12px]">
            <p className="font-sans font-medium text-[12.5px] leading-[19px] text-[#3d4566]">
              {isApprove ? 'Approve this resubmitted document?' : 'Request revision for this resubmitted document?'}
            </p>
            <p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4] pt-[4px]">
              {isApprove ? 'The panelist checklist will show Approved.' : 'Annotations will be committed and the author will be notified.'}
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
            disabled={busy || (decision === 'REJECTED' && !hasAnnotations)}
            className={`flex items-center justify-center gap-[6px] h-[36px] px-[16px] rounded-[9px] text-white font-sans font-bold text-[12px] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 outline-none ${
              isApprove
                ? 'bg-[#16a34a] hover:bg-[#15803d] focus-visible:ring-[#16a34a]'
                : 'bg-[#f59e0b] hover:bg-[#d97706] focus-visible:ring-[#f59e0b]'
            }`}
          >
            {busy ? <Loader2 className="size-[13px] animate-spin" /> : isApprove ? <Check className="size-[13px]" strokeWidth={2.5} /> : <RotateCcw className="size-[13px]" />}
            {isApprove ? 'Approve' : 'Request Revision'}
          </button>
        </div>
      </div>
    </div>
  )
}
