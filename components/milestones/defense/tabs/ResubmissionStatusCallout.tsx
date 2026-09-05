import { Check, Clock, FileText, TriangleAlert, Eye, FileSearch } from 'lucide-react'
import {
  deriveApprovalProgress,
  deriveResubmissionStatus,
} from '@/lib/defense/session-helpers'
import type { ResubmissionStatus } from '@/lib/defense/session-helpers'
import type { ChapterVersionItem } from '@/types/milestones'

// ── Types ────────────────────────────────────────────────────────────────────

export type ResubmissionStatusCalloutProps = {
  /** Derived status — when omitted, derived via deriveResubmissionStatus(reviews). */
  status?: ResubmissionStatus
  /** Per-panelist reviews for latest resubmission — drives status & progress. */
  reviews?: Array<{ status: string }>
  /** Overrides for display — when omitted, derived via deriveApprovalProgress. */
  approvedCount?: number
  total?: number
  comments?: number | null
  pages?: number | null
  reviewedAt?: string | null
  /** Version badge for latest resubmission (v2+). */
  version?: number
  /** Workspace link — defaults to /student/milestone/[milestone]/[documentId] when milestone+documentId given. */
  workspaceHref?: string
  milestone?: string
  documentId?: number | null
  /** Alternative: full resubmissions list — picks last element for version/workspaceHref/annotation. */
  resubmissions?: Array<{
    id?: number
    version: number
    annotationStats?: { comments: number; pages: number } | null
    comments?: number | null
    pages?: number | null
    reviewedAt?: string | null
    reviews?: Array<{ status: string }>
  }>
}

type CalloutMeta = {
  Icon: typeof Clock
  boxClass: string
  iconTileClass: string
  headlineClass: string
  headline: string
}

// ── Pure helpers (<50 lines) ─────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function resolveAnnotationStats(
  resubmissions?: ResubmissionStatusCalloutProps['resubmissions'],
  comments?: number | null,
  pages?: number | null,
): { comments: number; pages: number } | null {
  if (typeof comments === 'number' && typeof pages === 'number')
    return { comments, pages }
  const latest =
    resubmissions && resubmissions.length > 0
      ? resubmissions[resubmissions.length - 1]
      : null
  const ann = (latest as { annotationStats?: { comments: number; pages: number } | null } | null)
    ?.annotationStats
  if (ann && typeof ann.comments === 'number' && typeof ann.pages === 'number')
    return ann
  if (
    latest &&
    typeof (latest as { comments?: number | null }).comments === 'number' &&
    typeof (latest as { pages?: number | null }).pages === 'number'
  ) {
    return {
      comments: (latest as { comments: number }).comments,
      pages: (latest as { pages: number }).pages,
    }
  }
  return null
}

function getResubmissionCalloutMeta(status: ResubmissionStatus | 'NO_DOCUMENT'): CalloutMeta {
  if (status === 'APPROVED') {
    return {
      Icon: Check,
      boxClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
      iconTileClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
      headlineClass: 'text-[#16a34a]',
      headline: 'Approved',
    }
  }
  if (status === 'NEED_REVISION') {
    return {
      Icon: TriangleAlert,
      boxClass: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]',
      iconTileClass: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]',
      headlineClass: 'text-[#e11d48]',
      headline: 'Needs revision',
    }
  }
  if (status === 'NO_DOCUMENT') {
    return {
      Icon: FileText,
      boxClass: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]',
      iconTileClass: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.19)]',
      headlineClass: 'text-[#707dff]',
      headline: 'No document',
    }
  }
  return {
    Icon: Clock,
    boxClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    iconTileClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'In review',
  }
}

function buildCalloutContext(
  status: ResubmissionStatus | 'NO_DOCUMENT',
  comments: number | null,
  pages: number | null,
  reviewedAt: string | null,
): string {
  if (status === 'NO_DOCUMENT') {
    return 'No resubmitted document yet. Upload your revised document when ready.'
  }
  const hasCounts =
    typeof comments === 'number' && typeof pages === 'number' && comments >= 0
  const countsLabel = hasCounts ? `${comments} comments on ${pages} pages` : null
  const dateLabel = reviewedAt ? `Reviewed ${formatDate(reviewedAt)}` : null
  if (status === 'FOR_REVIEW') {
    const baseMessage = 'Document uploaded will be reviewed by the panelist'
    if (countsLabel) return `${countsLabel} · ${baseMessage}`
    return baseMessage
  }
  if (status === 'NEED_REVISION') {
    if (countsLabel && dateLabel) return `${countsLabel} · ${dateLabel}`
    if (countsLabel) return countsLabel
    if (dateLabel) return dateLabel
    return 'Requires revision'
  }
  if (countsLabel && dateLabel) return `${countsLabel} · ${dateLabel}`
  if (countsLabel) return countsLabel
  if (dateLabel) return dateLabel
  return 'All panelists approved'
}

function resolveWorkspaceHref(
  workspaceHref: string | undefined,
  milestone: string | undefined,
  documentId: number | null | undefined,
  resubmissions?: ResubmissionStatusCalloutProps['resubmissions'],
): string | undefined {
  if (workspaceHref) return workspaceHref
  const idFromResub =
    resubmissions && resubmissions.length > 0
      ? resubmissions[resubmissions.length - 1]?.id
      : undefined
  const id = documentId ?? idFromResub ?? null
  if (milestone && id != null) return `/student/milestone/${milestone}/${id}`
  return undefined
}

function resolveVersion(
  version: number | undefined,
  resubmissions?: ResubmissionStatusCalloutProps['resubmissions'],
): number | null {
  if (typeof version === 'number') return version
  const latest =
    resubmissions && resubmissions.length > 0
      ? resubmissions[resubmissions.length - 1]
      : null
  return latest ? latest.version : null
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Student ResubmissionStatusCallout — amber/red/green status for latest resubmission.
 * - Status via deriveResubmissionStatus(reviews), progress via deriveApprovalProgress(reviews)
 * - Displays approvedCount/total (e.g. 1/3), annotation comments/pages via resolveAnnotationStats, reviewedAt
 * - Version badge vN and workspaceHref /student/milestone/[milestone]/[documentId]
 * - Reuses lib/defense/session-helpers without duplicating business logic
 */
export function ResubmissionStatusCallout({
  status: statusProp,
  reviews,
  approvedCount: approvedCountProp,
  total: totalProp,
  comments: commentsProp,
  pages: pagesProp,
  reviewedAt: reviewedAtProp,
  version: versionProp,
  workspaceHref: workspaceHrefProp,
  milestone,
  documentId,
  resubmissions,
}: ResubmissionStatusCalloutProps) {
  const hasNoDocument = !resubmissions || resubmissions.length === 0
  const effectiveReviews = reviews ?? resubmissions?.[resubmissions.length - 1]?.reviews ?? []
  const derivedStatus = statusProp ?? deriveResubmissionStatus(effectiveReviews)
  const status: ResubmissionStatus | 'NO_DOCUMENT' = hasNoDocument ? 'NO_DOCUMENT' : derivedStatus
  const stats = resolveAnnotationStats(resubmissions, commentsProp, pagesProp)
  const comments = stats?.comments ?? commentsProp ?? null
  const pages = stats?.pages ?? pagesProp ?? null
  // reviewedAt via latest resubmission if not provided directly
  const latestReviewed =
    resubmissions && resubmissions.length > 0
      ? (resubmissions[resubmissions.length - 1] as { reviewedAt?: string | null }).reviewedAt ?? null
      : null
  const reviewedAt = reviewedAtProp ?? latestReviewed ?? null
  const meta = getResubmissionCalloutMeta(status as ResubmissionStatus)
  const Icon = meta.Icon
  const context = buildCalloutContext(status as ResubmissionStatus | 'NO_DOCUMENT', comments, pages, reviewedAt)

  return (
    <section
      aria-live="polite"
      className={`flex items-center gap-[12px] sm:gap-[16px] rounded-[14px] border px-[18px] py-[16px] sm:px-[22px] sm:py-[18px] ${meta.boxClass}`}
    >
      <div
        className={`flex size-[40px] items-center justify-center rounded-[12px] border shrink-0 ${meta.iconTileClass}`}
      >
        <Icon className={`size-[20px] ${meta.headlineClass}`} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <h2
          className={`font-['Sora',sans-serif] text-[15px] font-bold tracking-[-0.15px] ${meta.headlineClass}`}
        >
          {meta.headline}
        </h2>
        <p className="pt-[3px] font-sans font-medium text-[13px] leading-[19.5px] text-[#5a6382]">
          {context}
        </p>
      </div>
    </section>
  )
}

export default ResubmissionStatusCallout
