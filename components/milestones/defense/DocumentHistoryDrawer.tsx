'use client'

import { useEffect } from 'react'
import { Clock, Eye, FileSearch, X } from 'lucide-react'
import {
  CircleHistoryState,
  StatusPill,
  type DefenseDocumentInfo,
  type InitialDocumentStatus,
  type ResubmissionStatus,
} from './DefenseDocumentCard'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DocumentHistoryItem {
  info: DefenseDocumentInfo
  status: InitialDocumentStatus | ResubmissionStatus
}

interface DocumentHistoryDrawerProps {
  open: boolean
  onClose: () => void
  /** The group's initial defense document + its verdict status. */
  initial: DocumentHistoryItem | null
  /** All resubmissions, oldest first (chronological). */
  resubmissions: DocumentHistoryItem[]
  /** Defense schedule id for faculty workspace links (e.g. /faculty/defense/[scheduleId]/[submissionId]). */
  scheduleId?: number
  /** Milestone slug for student workspace links (e.g. proposal-defense). */
  milestoneSlug?: string
  /** Independent button logic — panelist: Review when pending, student: View when pending (opposite). */
  variant?: 'panelist' | 'student'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Muted "reviewed" line shown for verdict/reviewed states — now wired to real counts/date. */
function ReviewedLine({ comments, pages, reviewedAt }: { comments?: number | null; pages?: number | null; reviewedAt?: string | null }) {
  const hasCounts = typeof comments === 'number' && typeof pages === 'number' && comments > 0
  const dateLabel = reviewedAt ? formatDate(reviewedAt) : null
  if (hasCounts && dateLabel) {
    return (
      <p className="py-[3px] font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
        {comments} comments on {pages} pages · Reviewed {dateLabel}.
      </p>
    )
  }
  if (hasCounts) {
    return (
      <p className="py-[3px] font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
        {comments} comments on {pages} pages.
      </p>
    )
  }
  if (dateLabel) {
    return (
      <p className="py-[3px] font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
        Reviewed {dateLabel}.
      </p>
    )
  }
  return (
    <p className="py-[3px] font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
      Reviewed.
    </p>
  )
}

/** Amber status line with a small clock icon (No Verdict / In Review). */
function AmberStatusLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[5px] py-[3px]">
      <Clock className="size-[9.167px] text-[#f59e0b]" strokeWidth={2.5} />
      <p className="font-sans font-medium text-[12px] leading-[18px] text-[#f59e0b] whitespace-nowrap">
        {children}
      </p>
    </div>
  )
}

/** Secondary button (View / Replace) used in document rows. */
function GhostButton({
  icon,
  children,
  className,
  href,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  href?: string
}) {
  if (href) {
    return (
      <a
        href={href}
        className={`flex items-center gap-[5px] h-[32px] px-[13px] py-[6px] rounded-[8px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0 ${className ?? ''}`}
      >
        {icon}
        {children}
      </a>
    )
  }
  return (
    <button
      type="button"
      className={`flex items-center gap-[5px] h-[32px] px-[13px] py-[6px] rounded-[8px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0 ${className ?? ''}`}
    >
      {icon}
      {children}
    </button>
  )
}

/** Section heading (Initial Defense Document / Submission History). */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sora font-bold text-[13px] leading-[19.5px] text-[#1e3a8a]">
      {children}
    </p>
  )
}

// ── Initial document row ─────────────────────────────────────────────────────

/**
 * Initial Defense Document row (Figma 1448-7043).
 * Independent: panelist = Review when pending, student = View when pending (opposite after verdict).
 */
function InitialDocumentRow({
  item,
  scheduleId,
  milestoneSlug,
  variant = 'panelist',
}: {
  item: DocumentHistoryItem
  scheduleId?: number
  milestoneSlug?: string
  variant?: 'panelist' | 'student'
}) {
  const { info, status } = item
  const isNoVerdict = status === 'PENDING'
  // Student history: always View grey (per request) — panelist: Review when pending
  const isPanelist = variant === 'panelist'
  const showReview = isPanelist ? status === 'PENDING' || status === 'IN_REVIEW' : false
  const href =
    info.id && scheduleId
      ? `/faculty/defense/${scheduleId}/${info.id}`
      : info.id && milestoneSlug
        ? `/student/milestone/${milestoneSlug}/${info.id}`
        : undefined

  return (
    <div className="flex items-center gap-[14px]">
      <CircleHistoryState state={status} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[8px] min-w-0">
          <p className="truncate font-sora font-bold text-[13px] leading-[normal] text-[#1e3a8a]">
            {info.fileName}
          </p>
          {!isNoVerdict && <StatusPill state={status} />}
        </div>

        <p className="pt-[4px] truncate font-sans font-medium text-[12px] leading-[18px] text-[#6b7399]">
          PDF · {formatSize(info.size)} · {formatDate(info.submittedAt)} ·
          Submitted by {info.submittedByName}
        </p>

        {isNoVerdict ? (
          <AmberStatusLine>
            Wait for your defense schedule and verdict
          </AmberStatusLine>
        ) : (
          <ReviewedLine
            comments={(info as unknown as { comments?: number | null }).comments ?? null}
            pages={(info as unknown as { pages?: number | null }).pages ?? null}
            reviewedAt={(info as unknown as { reviewedAt?: string | null }).reviewedAt ?? null}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-[5px]">
        {showReview ? (
          <a
            href={href ?? info.blobUrl ?? '#'}
            className="flex items-center gap-[6px] h-[36px] px-[16px] rounded-[9px] bg-[#707dff] text-white font-sans font-bold text-[12.5px] leading-[18.75px] shadow-[0_3px_8px_rgba(112,125,255,0.24)] border border-[rgba(255,255,255,0.4)] hover:bg-[#5565ff] transition-all shrink-0"
          >
            <FileSearch className="size-[13px]" strokeWidth={2} />
            Review Document
          </a>
        ) : (
          <GhostButton icon={<Eye className="size-[11px]" />} href={href}>View</GhostButton>
        )}
      </div>
    </div>
  )
}

// ── Resubmission row ─────────────────────────────────────────────────────────

/**
 * Resubmission history row (Figma 1448-7162).
 * Independent: panelist = Review when IN_REVIEW, student = View when IN_REVIEW (opposite after verdict).
 */
function ResubmissionRow({
  item,
  isLast,
  scheduleId,
  milestoneSlug,
  variant = 'panelist',
}: {
  item: DocumentHistoryItem
  isLast: boolean
  scheduleId?: number
  milestoneSlug?: string
  variant?: 'panelist' | 'student'
}) {
  const { info, status } = item
  const isInReview = (status as string) === 'IN_REVIEW' || (status as string) === 'FOR_REVIEW'
  // Student history: always View grey (per request) — panelist: Review when IN_REVIEW
  const isPanelist = variant === 'panelist'
  const showReview = isPanelist ? isInReview : false
  const href =
    info.id && scheduleId
      ? `/faculty/defense/${scheduleId}/${info.id}`
      : info.id && milestoneSlug
        ? `/student/milestone/${milestoneSlug}/${info.id}`
        : undefined

  return (
    <div className="flex items-start gap-[14px]">
      {/* Timeline rail: status circle + connector */}
      <div className="flex flex-col items-center self-stretch shrink-0">
        <CircleHistoryState state={status} />
        {!isLast && (
          <span
            className={`w-[2px] flex-1 min-h-[24px] ${
              isInReview
                ? 'border-l border-dashed border-[#e8ebf8]'
                : 'bg-[#e8ebf8]'
            }`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-[22px]">
        <div className="flex items-center gap-[8px] min-w-0">
          <p className="truncate font-sora font-bold text-[13px] leading-[normal] text-[#1e3a8a]">
            {info.fileName}
          </p>
          <StatusPill state={status} />
        </div>

        <p className="pt-[4px] truncate font-sans font-medium text-[12px] leading-[18px] text-[#6b7399]">
          v{info.version ?? 2} · {formatDate(info.submittedAt)} · Submitted by{' '}
          {info.submittedByName}
        </p>

        {isInReview ? (
          <AmberStatusLine>Waiting for panelist approvals</AmberStatusLine>
        ) : (
          <ReviewedLine
            comments={(info as unknown as { comments?: number | null }).comments ?? null}
            pages={(info as unknown as { pages?: number | null }).pages ?? null}
            reviewedAt={(info as unknown as { reviewedAt?: string | null }).reviewedAt ?? null}
          />
        )}
      </div>

      <div className="w-[74px] shrink-0">
        {showReview ? (
          <a
            href={href ?? info.blobUrl ?? '#'}
            className="flex items-center justify-center gap-[6px] h-[36px] px-[16px] rounded-[9px] bg-[#707dff] text-white font-sans font-bold text-[12.5px] leading-[18.75px] shadow-[0_3px_8px_rgba(112,125,255,0.24)] border border-[rgba(255,255,255,0.4)] hover:bg-[#5565ff] transition-all w-full"
          >
            <FileSearch className="size-[13px]" strokeWidth={2} />
            Review
          </a>
        ) : (
          <GhostButton icon={<Eye className="size-[11px]" />} className="w-full justify-center" href={href}>
            View
          </GhostButton>
        )}
      </div>
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────

/** Empty state when there are no resubmissions yet. */
function EmptySubmissionHistory() {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-[10px] rounded-[12px] border border-[#eceef8] bg-[#fafbff] px-[20px] py-[28px] text-center">
      <div className="flex size-[40px] items-center justify-center rounded-[20px] bg-[#f4f5fc]">
        <Clock className="size-[18px] text-[#707dff]" strokeWidth={2} />
      </div>
      <p className="font-sora text-[13px] font-semibold text-[#1e3a8a]">
        No resubmissions yet
      </p>
      <p className="max-w-[280px] font-sans font-medium text-[11.5px] leading-[17.25px] text-[#9ea8c6]">
        Resubmitted documents will appear here once you submit a revised version
        after a revision verdict.
      </p>
    </div>
  )
}

// ── Drawer root ──────────────────────────────────────────────────────────────

/**
 * Document History Drawer (Figma 1448-6887).
 *
 * Right-side drawer showing the group's initial defense document and the full
 * submission history (all resubmissions). Reuses the existing drawer pattern
 * (backdrop, Escape-to-close, body scroll lock) and the shared status
 * circle/pill components from DefenseDocumentCard.
 */
export function DocumentHistoryDrawer({
  open,
  onClose,
  initial,
  resubmissions,
  scheduleId,
  milestoneSlug,
  variant = 'panelist',
}: DocumentHistoryDrawerProps & { variant?: 'panelist' | 'student' }) {
  // Escape closes; body scroll locks while the drawer is open (matches the
  // existing faculty/evaluation drawers).
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] transition-all duration-300 ${
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Document history"
        className={`fixed top-0 right-0 h-dvh w-[600px] max-w-full z-50 bg-white border-l border-[#eceef8] shadow-[-8px_0px_40px_rgba(112,125,255,0.14),-2px_0px_8px_rgba(0,0,0,0.05)] transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f2fa] px-[22px] pt-[18px] pb-[17px]">
          <p className="font-sora font-bold text-[15px] leading-[22.5px] tracking-[-0.15px] text-[#1e3a8a]">
            Document History
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document history"
            className="flex items-center rounded-[7px] p-[5px] text-[#8a93b4] hover:bg-gray-50 transition-colors"
          >
            <X className="size-[17px]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto py-[20px]">
          {/* Initial Defense Document */}
          <div className="flex flex-col gap-[10px] px-[25px] pb-[22px]">
            <SectionHeading>Initial Defense Document</SectionHeading>
            {initial ? (
              <InitialDocumentRow item={initial} scheduleId={scheduleId} milestoneSlug={milestoneSlug} variant={variant} />
            ) : (
              <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
                No initial document has been submitted yet.
              </p>
            )}
          </div>

          {/* Submission History */}
          <div className="flex flex-col gap-[10px] px-[25px]">
            <SectionHeading>Submission History</SectionHeading>
            {resubmissions.length === 0 ? (
              <EmptySubmissionHistory />
            ) : (
              <div className="flex flex-col">
                {resubmissions.map((item, index) => (
                  <ResubmissionRow
                    key={item.info.blobUrl}
                    item={item}
                    isLast={index === resubmissions.length - 1}
                    scheduleId={scheduleId}
                    milestoneSlug={milestoneSlug}
                    variant={variant}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
