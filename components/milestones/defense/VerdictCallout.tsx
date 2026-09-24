'use client'

import { createContext, use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Check,
  Clock,
  FileText,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  PANELIST_VERDICT_VARIANTS,
  resolvePanelistVisualState,
  type CalloutVariantMeta,
  type PanelistVerdictState,
} from './verdict-callout-variants'
import { submitPanelistVerdict } from '@/lib/actions/defense'
import type { DefenseVerdict } from '@prisma/client'

// ── Types ────────────────────────────────────────────────────────────────────

export type VerdictCalloutState =
  | 'NO_DOCUMENT'
  | 'WAITING_FOR_SCHEDULE'
  | 'APPROVED'
  | 'MINOR_REVISION'
  | 'MAJOR_REVISION'
  | 'REDEFENSE'

interface VerdictCalloutProps {
  state: VerdictCalloutState
  reviewedAt?: string | null
  comments?: number | null
  pages?: number | null
  /** Student workspace href — clicking "Review feedback" navigates to the document workspace */
  workspaceHref?: string
  onReviewFeedback?: () => void
}

export type PanelistVerdictCalloutProps = {
  /** Explicit variant — 5 values; awaiting splits via isChair (Figma 1428-12746) */
  state: PanelistVerdictState
  isChair: boolean
  /** When provided + isChair + PENDING, enables the Submit Verdict flow */
  scheduleId?: number
  /** Submit Verdict is disabled without a submitted document (default true). */
  hasDocument?: boolean
  /** Optional callback when Review feedback is clicked (verdict states) */
  onReviewFeedback?: () => void
  /** Fired after a successful verdict submit (allows parent to refresh/navigate) */
  onVerdictSubmitted?: () => void
  reviewedAt?: string | null
  comments?: number | null
  pages?: number | null
}

// Shared shape used by both student and panelist variants
type CalloutMeta = {
  Icon: typeof FileText
  boxClass: string
  iconTileClass: string
  headlineClass: string
  headline: string
  context: string
  button?: {
    backgroundImage: string
    shadow: string
    label?: string
    icon?: typeof FileText
  }
}

// ── Verdict options (hoisted static) ─────────────────────────────────────────

const VERDICT_OPTIONS: ReadonlyArray<{
  value: DefenseVerdict
  label: string
  description: string
}> = [
  { value: 'APPROVED', label: 'Approved', description: 'Capstone is approved as-is.' },
  { value: 'MINOR_REVISION', label: 'Minor Revision', description: 'Small corrections required.' },
  { value: 'MAJOR_REVISION', label: 'Major Revision', description: 'Significant changes required.' },
  { value: 'REDEFENSE', label: 'Redefense', description: 'Capstone must be defended again.' },
]

// ── Helpers for dynamic verdict context ──────────────────────────────────────

function formatReviewedDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildVerdictContext(reviewedAt?: string | null, comments?: number | null, pages?: number | null): string | null {
  const dateLabel = formatReviewedDate(reviewedAt)
  const hasCounts = typeof comments === 'number' && typeof pages === 'number' && comments > 0
  if (hasCounts && dateLabel) return `${comments} comments on ${pages} pages · Reviewed ${dateLabel}.`
  if (hasCounts) return `${comments} comments on ${pages} pages.`
  if (dateLabel) return `Reviewed ${dateLabel}.`
  return null
}

// ── State metadata (student milestone — Figma 1412-6143) ─────────────────────

const STATES: Record<VerdictCalloutState, CalloutMeta> = {
  NO_DOCUMENT: {
    Icon: FileText,
    boxClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconTileClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'No Document Uploaded',
    context: 'Upload your document before the defense schedule',
  },
  WAITING_FOR_SCHEDULE: {
    Icon: Clock,
    boxClass: 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.2)]',
    iconTileClass: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]',
    headlineClass: 'text-[#707dff]',
    headline: 'Waiting for Schedule & Verdict',
    context: 'Wait for your schedule. Verdict will be posted once submitted by the panel.',
  },
  APPROVED: {
    Icon: Check,
    boxClass: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)]',
    iconTileClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
    headlineClass: 'text-[#16a34a]',
    headline: 'Approved',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage: 'linear-gradient(103.38deg, rgb(22, 163, 74) 0%, rgb(18, 140, 63) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(22,163,74,0.22)]',
    },
  },
  MINOR_REVISION: {
    Icon: Clock,
    boxClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconTileClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'Minor Revision',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage: 'linear-gradient(104.12deg, rgb(245, 158, 11) 5.11%, rgb(218, 140, 7) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(245,158,11,0.22)]',
    },
  },
  MAJOR_REVISION: {
    Icon: TriangleAlert,
    boxClass: 'bg-[rgba(225,104,29,0.07)] border-[rgba(225,104,29,0.2)]',
    iconTileClass: 'bg-[rgba(225,104,29,0.08)] border-[rgba(225,104,29,0.19)]',
    headlineClass: 'text-[#e1681d]',
    headline: 'Major Revision',
    context: '4 comments on 3 pages · Reviewed May 31, 2026.',
    button: {
      backgroundImage: 'linear-gradient(103.38deg, rgb(225, 104, 29) 0%, rgb(184, 82, 19) 99.93%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(225,104,29,0.22)]',
    },
  },
  REDEFENSE: {
    Icon: TriangleAlert,
    boxClass: 'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)]',
    iconTileClass: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]',
    headlineClass: 'text-[#e11d48]',
    headline: 'Redefense',
    context: 'A redefense is required. Please wait for your new defense schedule to be posted.',
    button: {
      backgroundImage: 'linear-gradient(115.15deg, rgb(225, 29, 72) 44.98%, rgb(200, 26, 64) 99.87%)',
      shadow: 'drop-shadow-[0px_3px_4px_rgba(225,29,72,0.22)]',
    },
  },
}

// ── Shared primitive (role-agnostic) ─────────────────────────────────────────

/**
 * Role-agnostic callout shell — Figma 1412-6143 / 1428-12746.
 * Button is dynamic: label from meta.button.label ?? "Review feedback",
 * icon from meta.button.icon ?? MessageSquareText. Exposes onButtonClick.
 */
function CalloutShell({
  meta,
  onButtonClick,
  buttonDisabled = false,
  buttonDisabledLabel,
}: {
  meta: CalloutMeta | CalloutVariantMeta
  onButtonClick?: () => void
  buttonDisabled?: boolean
  buttonDisabledLabel?: string
}) {
  const Icon = meta.Icon
  const button = meta.button
  const ButtonIcon = button?.icon ?? MessageSquareText
  const label = buttonDisabled
    ? (buttonDisabledLabel ?? button?.label ?? 'Review feedback')
    : (button?.label ?? 'Review feedback')
  return (
    <section
      aria-live="polite"
      className={`flex flex-col gap-[12px] sm:flex-row sm:items-center sm:gap-[16px] rounded-[14px] border px-[18px] py-[16px] sm:px-[22px] sm:py-[18px] ${meta.boxClass}`}
    >
      <div className="flex items-center gap-[12px] sm:gap-[16px] min-w-0 flex-1">
        <div
          className={`flex size-[40px] items-center justify-center rounded-[12px] border shrink-0 ${meta.iconTileClass}`}
        >
          <Icon className={`size-[20px] ${meta.headlineClass}`} strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className={`font-sora text-[15px] font-bold tracking-[-0.15px] ${meta.headlineClass}`}>
            {meta.headline}
          </h2>
          <p className="pt-[3px] font-sans font-medium text-[13px] leading-[19.5px] text-[#5a6382]">
            {meta.context}
          </p>
        </div>
      </div>

      {button ? (
        <button
          type="button"
          onClick={buttonDisabled ? undefined : onButtonClick}
          disabled={buttonDisabled}
          title={buttonDisabled ? 'Waiting for the group to submit a document' : undefined}
          className={`flex w-full sm:w-auto shrink-0 items-center justify-center gap-[7px] rounded-[9px] border px-[18px] py-[9px] font-sans font-bold text-[12.5px] leading-[18.75px] text-white transition-all duration-150 ease-out hover:brightness-110 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] hover:scale-[1.015] active:translate-y-0 active:scale-100 active:brightness-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-none ${button.shadow}`}
          style={{
            backgroundImage: button.backgroundImage,
            borderColor: 'rgba(255,255,255,0.4)',
          }}
        >
          <ButtonIcon className="size-[13px] strokeWidth={2}" />
          {label}
        </button>
      ) : null}
    </section>
  )
}

// ── Submit Verdict composition (chair-only) ──────────────────────────────────

interface SubmitVerdictContextValue {
  isOpen: boolean
  selected: DefenseVerdict | null
  busy: boolean
  open: () => void
  close: () => void
  select: (v: DefenseVerdict) => void
  confirm: () => Promise<void>
}

const SubmitVerdictContext = createContext<SubmitVerdictContextValue | null>(null)

function useSubmitVerdict(): SubmitVerdictContextValue {
  const ctx = use(SubmitVerdictContext)
  if (!ctx) throw new Error('SubmitVerdict must be within Provider')
  return ctx
}

function SubmitVerdictProvider({
  scheduleId,
  onSubmitted,
  children,
}: {
  scheduleId: number
  onSubmitted?: () => void
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<DefenseVerdict | null>(null)
  const [busy, setBusy] = useState(false)

  function open() {
    if (busy) return
    setIsOpen(true)
  }

  function close() {
    if (busy) return
    setIsOpen(false)
  }

  function select(value: DefenseVerdict) {
    if (busy) return
    setSelected(value)
  }

  async function confirm() {
    if (!selected || busy) return
    setBusy(true)
    try {
      const result = await submitPanelistVerdict(scheduleId, selected)
      if (!result.success) {
        toast.error(result.message || 'Failed to submit verdict.')
        setBusy(false)
        return
      }
      toast.success(result.message || 'Verdict submitted.')
      setIsOpen(false)
      setSelected(null)
      if (onSubmitted) onSubmitted()
      router.refresh()
    } catch {
      toast.error('Failed to submit verdict. Please try again.')
      setBusy(false)
      return
    }
    setBusy(false)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !busy) close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, busy])

  return (
    <SubmitVerdictContext value={{ isOpen, selected, busy, open, close, select, confirm }}>
      {children}
    </SubmitVerdictContext>
  )
}

function SubmitVerdictHeader() {
  const { busy, close } = useSubmitVerdict()
  return (
    <div className="flex items-start justify-between gap-[16px] px-6 pt-5 pb-4 border-b border-[#eceef8]">
      <div>
        <h3
          id="submit-verdict-title"
          className="font-sora font-bold text-[16px] leading-[24px] text-[#12143a] tracking-[-0.15px]"
        >
          Submit Verdict
        </h3>
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
          Select the final verdict for this defense. This cannot be undone.
        </p>
      </div>
      <button
        type="button"
        onClick={close}
        disabled={busy}
        aria-label="Close"
        className="bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0 disabled:opacity-60"
      >
        <X className="size-[13px] text-[#8a93b4]" />
      </button>
    </div>
  )
}

function getVerdictAccent(verdict: DefenseVerdict) {
  switch (verdict) {
    case 'APPROVED':
      return {
        border: 'border-[#16a34a]',
        bg: 'bg-[rgba(22,163,74,0.08)]',
        circleBorder: 'border-[#16a34a]',
        circleBg: 'bg-[#16a34a]',
      }
    case 'MINOR_REVISION':
      return {
        border: 'border-[#f59e0b]',
        bg: 'bg-[rgba(245,158,11,0.08)]',
        circleBorder: 'border-[#f59e0b]',
        circleBg: 'bg-[#f59e0b]',
      }
    case 'MAJOR_REVISION':
      return {
        border: 'border-[#e1681d]',
        bg: 'bg-[rgba(225,104,29,0.08)]',
        circleBorder: 'border-[#e1681d]',
        circleBg: 'bg-[#e1681d]',
      }
    case 'REDEFENSE':
      return {
        border: 'border-[#e11d48]',
        bg: 'bg-[rgba(225,29,72,0.08)]',
        circleBorder: 'border-[#e11d48]',
        circleBg: 'bg-[#e11d48]',
      }
    default:
      return {
        border: 'border-[#707dff]',
        bg: 'bg-[rgba(112,125,255,0.08)]',
        circleBorder: 'border-[#707dff]',
        circleBg: 'bg-[#707dff]',
      }
  }
}

function SubmitVerdictOptions() {
  const { selected, busy, select } = useSubmitVerdict()
  return (
    <div className="flex flex-col gap-[8px]">
      {VERDICT_OPTIONS.map((opt) => {
        const isSelected = selected === opt.value
        const accent = getVerdictAccent(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => select(opt.value)}
            disabled={busy}
            className={`flex items-center gap-[12px] w-full text-left rounded-[10px] border px-[14px] py-[11px] transition-colors disabled:cursor-not-allowed ${
              isSelected ? `${accent.border} ${accent.bg}` : 'border-[#eceef8] bg-white hover:bg-[#fafbff]'
            }`}
          >
            <span
              className={`flex size-[22px] items-center justify-center rounded-full border shrink-0 ${
                isSelected ? `${accent.circleBorder} ${accent.circleBg} text-white` : 'border-[#eceef8] bg-[#fafbff] text-[#bbc0d8]'
              }`}
            >
              {isSelected ? <Check className="size-[12px]" strokeWidth={2.5} /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-sans font-bold text-[13px] leading-[19px] text-[#12143a]">{opt.label}</span>
              <span className="block font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                {opt.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function getVerdictButtonStyle(verdict: DefenseVerdict | null) {
  switch (verdict) {
    case 'APPROVED':
      return {
        backgroundImage: 'linear-gradient(103.38deg, rgb(22, 163, 74) 0%, rgb(18, 140, 63) 99.93%)',
        shadow: 'drop-shadow-[0px_3px_4px_rgba(22,163,74,0.22)]',
      }
    case 'MINOR_REVISION':
      return {
        backgroundImage: 'linear-gradient(104.12deg, rgb(245, 158, 11) 5.11%, rgb(218, 140, 7) 99.93%)',
        shadow: 'drop-shadow-[0px_3px_4px_rgba(245,158,11,0.22)]',
      }
    case 'MAJOR_REVISION':
      return {
        backgroundImage: 'linear-gradient(103.38deg, rgb(225, 104, 29) 0%, rgb(184, 82, 19) 99.93%)',
        shadow: 'drop-shadow-[0px_3px_4px_rgba(225,104,29,0.22)]',
      }
    case 'REDEFENSE':
      return {
        backgroundImage: 'linear-gradient(115.15deg, rgb(225, 29, 72) 44.98%, rgb(200, 26, 64) 99.87%)',
        shadow: 'drop-shadow-[0px_3px_4px_rgba(225,29,72,0.22)]',
      }
    default:
      return {
        backgroundImage: 'linear-gradient(135deg, #707dff 0%, #5565ff 100%)',
        shadow: 'drop-shadow-[0px_3px_4px_rgba(112,125,255,0.22)]',
      }
  }
}

function SubmitVerdictFooter() {
  const { busy, selected, close, confirm } = useSubmitVerdict()
  const btnStyle = getVerdictButtonStyle(selected)
  return (
    <div className="flex items-center justify-end gap-[8px] px-6 py-4 border-t border-[#eceef8] bg-[#fafbff] rounded-b-[16px]">
      <button
        type="button"
        onClick={close}
        disabled={busy}
        className="h-[32px] px-[12px] rounded-[8px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={confirm}
        disabled={busy || !selected}
        className={`flex items-center justify-center gap-[6px] h-[36px] px-[16px] rounded-[9px] border text-white font-sans font-bold text-[12px] transition-opacity hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 outline-none ${btnStyle.shadow}`}
        style={{ backgroundImage: btnStyle.backgroundImage, borderColor: 'rgba(255,255,255,0.4)' }}
      >
        {busy ? <Loader2 className="size-[13px] animate-spin" /> : <ShieldCheck className="size-[13px]" strokeWidth={2} />}
        Confirm Verdict
      </button>
    </div>
  )
}

function SubmitVerdictDialog() {
  const { isOpen, busy, close } = useSubmitVerdict()
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]"
      onClick={busy ? undefined : close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-verdict-title"
        className="w-full max-w-[440px] bg-white border border-[#eceef8] rounded-[16px] shadow-[0_16px_48px_rgba(16,19,58,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <SubmitVerdictHeader />
        <div className="px-6 py-5 flex flex-col gap-[16px]">
          <SubmitVerdictOptions />
          <div className="bg-[#f8f9ff] border border-[#eef0fb] rounded-[9px] px-[14px] py-[12px]">
            <p className="font-sans font-medium text-[12.5px] leading-[19px] text-[#3d4566]">
              The verdict will be visible to the group and panelists immediately.
            </p>
          </div>
        </div>
        <SubmitVerdictFooter />
      </div>
    </div>
  )
}

function AwaitingChairCallout({
  meta,
  disabled = false,
}: {
  meta: CalloutVariantMeta
  disabled?: boolean
}) {
  const { open } = useSubmitVerdict()
  return (
    <CalloutShell
      meta={meta}
      onButtonClick={open}
      buttonDisabled={disabled}
      buttonDisabledLabel="Awaiting document"
    />
  )
}

// ── Student component (wired to true date) ─────────────────────────────────

export function VerdictCallout({ state, reviewedAt, comments, pages, workspaceHref, onReviewFeedback }: VerdictCalloutProps) {
  const router = useRouter()
  const base = STATES[state]
  const dynamic = buildVerdictContext(reviewedAt, comments, pages)
  const meta =
    dynamic && (state === 'APPROVED' || state === 'MINOR_REVISION' || state === 'MAJOR_REVISION')
      ? { ...base, context: dynamic }
      : base
  function handleReviewFeedback() {
    if (onReviewFeedback) {
      onReviewFeedback()
      return
    }
    if (workspaceHref) router.push(workspaceHref)
  }
  return <CalloutShell meta={meta} onButtonClick={handleReviewFeedback} />
}

// ── Panelist component (6 explicit states — Figma 1428-12746) ─────────────────

export function PanelistVerdictCallout({
  state,
  isChair,
  scheduleId,
  hasDocument = true,
  onReviewFeedback,
  onVerdictSubmitted,
}: PanelistVerdictCalloutProps) {
  const visual = resolvePanelistVisualState(state, isChair)
  const meta = PANELIST_VERDICT_VARIANTS[visual]

  if (visual === 'awaiting-chair' && typeof scheduleId === 'number') {
    return (
      <SubmitVerdictProvider scheduleId={scheduleId} onSubmitted={onVerdictSubmitted}>
        <AwaitingChairCallout meta={meta} disabled={!hasDocument} />
        <SubmitVerdictDialog />
      </SubmitVerdictProvider>
    )
  }

  // Panelist defense session: never show "Review feedback" — student only. Only chair's "Submit Verdict" (awaiting-chair) has a button.
  const panelistMeta = visual === 'awaiting-chair' ? meta : { ...meta, button: undefined }
  return <CalloutShell meta={panelistMeta} />
}

// Backwards-compat alias
export const DefensePanelistVerdictCallout = PanelistVerdictCallout

// Compound exports for flexible composition
export const SubmitVerdict = {
  Provider: SubmitVerdictProvider,
  Dialog: SubmitVerdictDialog,
  Header: SubmitVerdictHeader,
  Options: SubmitVerdictOptions,
  Footer: SubmitVerdictFooter,
  Context: SubmitVerdictContext,
}
