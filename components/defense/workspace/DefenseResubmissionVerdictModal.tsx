'use client'

import { createContext, use, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Check,
  Highlighter,
  Loader2,
  Pen,
  StickyNote,
  Strikethrough,
  Type,
  X,
} from 'lucide-react'
import { reviewDefenseResubmission } from '@/lib/actions/defense'

export type DefenseResubmissionSummary = Record<string, number>

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

type ResubmissionVerdict = 'APPROVED' | 'REDEFENSE'

const VERDICT_OPTIONS: ReadonlyArray<{
  value: ResubmissionVerdict
  label: string
  description: string
  border: string
  bg: string
  circleBorder: string
  circleBg: string
  buttonGradient: string
  buttonShadow: string
}> = [
  {
    value: 'APPROVED',
    label: 'Approved',
    description: 'The resubmission is approved as-is.',
    border: 'border-[#16a34a]',
    bg: 'bg-[rgba(22,163,74,0.08)]',
    circleBorder: 'border-[#16a34a]',
    circleBg: 'bg-[#16a34a]',
    buttonGradient:
      'linear-gradient(103.38deg, rgb(22, 163, 74) 0%, rgb(18, 140, 63) 99.93%)',
    buttonShadow: 'drop-shadow-[0px_3px_4px_rgba(22,163,74,0.22)]',
  },
  {
    value: 'REDEFENSE',
    label: 'Redefense',
    description: 'The resubmission must be defended again.',
    border: 'border-[#e11d48]',
    bg: 'bg-[rgba(225,29,72,0.08)]',
    circleBorder: 'border-[#e11d48]',
    circleBg: 'bg-[#e11d48]',
    buttonGradient:
      'linear-gradient(115.15deg, rgb(225, 29, 72) 44.98%, rgb(200, 26, 64) 99.87%)',
    buttonShadow: 'drop-shadow-[0px_3px_4px_rgba(225,29,72,0.22)]',
  },
]

interface DefenseResubmissionVerdictModalProps {
  submissionId: number
  scheduleId?: number
  decision: ResubmissionVerdict | null
  annotationSummary?: DefenseResubmissionSummary
  annotationData: unknown | null
  onClose: () => void
  onCommitted: () => void
}

interface DefenseResubmissionVerdictContextValue {
  submissionId: number
  decision: ResubmissionVerdict | null
  selected: ResubmissionVerdict | null
  select: (decision: ResubmissionVerdict) => void
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
  const [selected, setSelected] =
    useState<ResubmissionVerdict | null>(decision)
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
    if (busy || !selected) return
    // Redefense requires at least one annotation (like evaluation)
    if (selected === 'REDEFENSE' && !hasAnnotations) {
      toast.error('Add at least one annotation before requesting a redefense.')
      return
    }
    setBusy(true)
    try {
      const payload = annotationData ?? []
      const result = await reviewDefenseResubmission(submissionId, selected, payload)
      if (!result.success) {
        toast.error(result.message || 'Failed to submit review.')
        setBusy(false)
        return
      }
      toast.success(result.message || (selected === 'APPROVED' ? 'Resubmission approved.' : 'Redefense requested.'))
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
        selected,
        select: setSelected,
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
  const {
    busy,
    selected,
    select,
    annotationSummary,
    onClose,
    confirm,
    hasAnnotations,
  } = useDefenseResubmissionVerdict()
  const selectedOption = VERDICT_OPTIONS.find((o) => o.value === selected)
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
              Submit Review
            </h3>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              Review your annotations, then select the final verdict for this
              resubmission.
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
            <p className="font-sans font-extrabold text-[10px] leading-[15px] tracking-[0.9px] uppercase text-[#bbc0d8]">
              Annotation Summary
            </p>
            {!hasAnnotations ? (
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

          <div className="flex flex-col gap-[10px]">
            <p className="font-sans font-extrabold text-[10px] leading-[15px] tracking-[0.9px] uppercase text-[#bbc0d8]">
              Resubmission Verdict
            </p>
            <div className="flex flex-col gap-[8px]" role="radiogroup" aria-label="Resubmission verdict">
              {VERDICT_OPTIONS.map((opt) => {
                const isSelected = selected === opt.value
                const disabled =
                  busy || (opt.value === 'REDEFENSE' && !hasAnnotations)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => select(opt.value)}
                    disabled={disabled}
                    title={
                      opt.value === 'REDEFENSE' && !hasAnnotations
                        ? 'Add at least one annotation before requesting a redefense'
                        : undefined
                    }
                    className={`flex items-center gap-[12px] w-full text-left rounded-[10px] border px-[14px] py-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected
                        ? `${opt.border} ${opt.bg}`
                        : 'border-[#eceef8] bg-white hover:bg-[#fafbff]'
                    }`}
                  >
                    <span
                      className={`flex size-[22px] items-center justify-center rounded-full border shrink-0 ${
                        isSelected
                          ? `${opt.circleBorder} ${opt.circleBg} text-white`
                          : 'border-[#eceef8] bg-[#fafbff] text-[#bbc0d8]'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="size-[12px]" strokeWidth={2.5} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-sans font-bold text-[13px] leading-[19px] text-[#12143a]">
                        {opt.label}
                      </span>
                      <span className="block font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            {!hasAnnotations && (
              <p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                Add at least one annotation to enable the Redefense verdict.
              </p>
            )}
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
            disabled={busy || !selected}
            className={`flex items-center justify-center gap-[6px] h-[36px] px-[16px] rounded-[9px] border text-white font-sans font-bold text-[12px] transition-opacity hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 outline-none ${selectedOption?.buttonShadow ?? ''}`}
            style={{
              backgroundImage:
                selectedOption?.buttonGradient ??
                'linear-gradient(135deg, #707dff 0%, #5565ff 100%)',
              borderColor: 'rgba(255,255,255,0.4)',
            }}
          >
            {busy ? (
              <Loader2 className="size-[13px] animate-spin" />
            ) : (
              <Check className="size-[13px]" strokeWidth={2.5} />
            )}
            Submit Review
          </button>
        </div>
      </div>
    </div>
  )
}
