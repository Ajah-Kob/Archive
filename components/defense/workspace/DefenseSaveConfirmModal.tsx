'use client'

import { createContext, use, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Highlighter,
  Loader2,
  Pen,
  Save,
  StickyNote,
  Strikethrough,
  Type,
  X,
} from 'lucide-react'
import { commitDefenseAnnotations } from '@/lib/actions/defense-annotations'

export type DefenseAnnotationSummary = Record<string, number>

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

interface DefenseSaveConfirmModalProps {
  submissionId: number
  scheduleId?: number
  annotationSummary?: DefenseAnnotationSummary
  annotationData: unknown | null
  onClose: () => void
  onCommitted: () => void
}

interface DefenseSaveConfirmContextValue {
  submissionId: number
  scheduleId?: number
  annotationSummary: DefenseAnnotationSummary
  annotationData: unknown | null
  busy: boolean
  totalCount: number
  hasAnnotations: boolean
  onClose: () => void
  confirm: () => Promise<void>
}

const DefenseSaveConfirmContext =
  createContext<DefenseSaveConfirmContextValue | null>(null)

function useDefenseSaveConfirm(): DefenseSaveConfirmContextValue {
  const ctx = use(DefenseSaveConfirmContext)
  if (!ctx) throw new Error('DefenseSaveConfirm must be within Provider')
  return ctx
}

function getTotalCount(summary: DefenseAnnotationSummary): number {
  return SUMMARY_ROWS.reduce(
    (sum, row) => sum + (summary[row.key] ?? 0),
    0,
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans font-extrabold text-[10px] leading-[15px] tracking-[0.9px] uppercase text-[#bbc0d8]">
      {children}
    </p>
  )
}

function DefenseSaveConfirmHeader() {
  const { busy, onClose } = useDefenseSaveConfirm()
  return (
    <div className="flex items-start justify-between gap-[16px] px-6 pt-5 pb-4 border-b border-[#eceef8]">
      <div>
        <h3
          id="defense-save-confirm-title"
          className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]"
        >
          Save annotations
        </h3>
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
          Your annotations will be saved and you will return to the defense session.
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
  )
}

function DefenseSaveConfirmSummary() {
  const { annotationSummary, totalCount } = useDefenseSaveConfirm()
  return (
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
  )
}

function DefenseSaveConfirmBox() {
  return (
    <div className="bg-[#f8f9ff] border border-[#eef0fb] rounded-[9px] px-[14px] py-[12px]">
      <p className="font-sans font-medium text-[12.5px] leading-[19px] text-[#3d4566]">
        Save annotations and return to defense session?
      </p>
      <p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4] pt-[4px]">
        Your annotations will be committed and you will be redirected to the defense session.
      </p>
    </div>
  )
}

function DefenseSaveConfirmFooter() {
  const { busy, hasAnnotations, onClose, confirm } = useDefenseSaveConfirm()
  return (
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
        disabled={busy || !hasAnnotations}
        className="flex items-center justify-center gap-[6px] h-[36px] px-[16px] rounded-[9px] bg-[#707dff] text-white font-sans font-bold text-[12px] hover:bg-[#5565ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none"
      >
        {busy ? (
          <Loader2 className="size-[13px] animate-spin" />
        ) : (
          <Save className="size-[13px]" strokeWidth={2} />
        )}
        Save annotation
      </button>
    </div>
  )
}

function DefenseSaveConfirmProvider({
  submissionId,
  scheduleId,
  annotationSummary = {},
  annotationData,
  onClose,
  onCommitted,
  children,
}: DefenseSaveConfirmModalProps & { children: React.ReactNode }) {
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
    setBusy(true)
    try {
      const payload = annotationData ?? []
      // Wait for the server to persist the COMMITTED row before showing success
      const result = await commitDefenseAnnotations(submissionId, payload)
      if (!result.success) {
        toast.error(result.message || 'Failed to save annotations.')
        setBusy(false)
        return
      }
      // Annotation is now saved — navigate first, then unmount (avoids refresh-before-push race)
      toast.success(result.message || 'Annotations saved.')
      onCommitted()
      onClose()
      return
    } catch (error) {
      console.error('[DefenseSaveConfirmModal] commit failed:', error)
      toast.error('Failed to save annotations. Please try again.')
      setBusy(false)
      return
    }
  }

  return (
    <DefenseSaveConfirmContext
      value={{
        submissionId,
        scheduleId,
        annotationSummary,
        annotationData,
        busy,
        totalCount,
        hasAnnotations,
        onClose,
        confirm,
      }}
    >
      {children}
    </DefenseSaveConfirmContext>
  )
}

function DefenseSaveConfirmDialog() {
  const { busy, onClose } = useDefenseSaveConfirm()
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="defense-save-confirm-title"
        className="w-full max-w-[440px] bg-white border border-[#eceef8] rounded-[16px] shadow-[0_16px_48px_rgba(16,19,58,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <DefenseSaveConfirmHeader />
        <div className="px-6 py-5 flex flex-col gap-[16px]">
          <DefenseSaveConfirmSummary />
          <DefenseSaveConfirmBox />
        </div>
        <DefenseSaveConfirmFooter />
      </div>
    </div>
  )
}

/**
 * Defense save confirmation modal — defense-specific single-path variant of
 * VerdictConfirmModal. Shows per-tool annotation counts (highlight/text/ink/
 * freeText/strikeout) filtered via isReviewAnnotation upstream, then a single
 * Save path that commits via commitDefenseAnnotations. On success the parent's
 * onCommitted refreshes and redirects to /faculty/defense/[scheduleId].
 */
export function DefenseSaveConfirmModal(props: DefenseSaveConfirmModalProps) {
  return (
    <DefenseSaveConfirmProvider {...props}>
      <DefenseSaveConfirmDialog />
    </DefenseSaveConfirmProvider>
  )
}

/**
 * Compound exports for flexible composition — all subcomponents read from the
 * same DefenseSaveConfirmContext via use() (React 19). Prefer the main
 * DefenseSaveConfirmModal for the default layout; compose these for custom shells.
 */
export const DefenseSaveConfirm = {
  Provider: DefenseSaveConfirmProvider,
  Dialog: DefenseSaveConfirmDialog,
  Header: DefenseSaveConfirmHeader,
  Summary: DefenseSaveConfirmSummary,
  Box: DefenseSaveConfirmBox,
  Footer: DefenseSaveConfirmFooter,
  Context: DefenseSaveConfirmContext,
}

export type AnnotationSummary = DefenseAnnotationSummary
