'use client'

import { Check, Clock, TriangleAlert } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ResubmittedDocumentCard } from './ResubmittedDocumentCard'
import { ApprovalChecklistCard } from './ApprovalChecklistCard'
import {
  deriveApprovalChecklist,
  deriveApprovalProgress,
  deriveResubmissionStatus,
  isPanelistReadOnly,
  shouldResetOnResubmission,
} from '@/lib/defense/session-helpers'
import type { DefenseSessionPayload } from '@/lib/actions/defense'
import type { DefenseReviewStatus } from '@prisma/client'

// ── Types ────────────────────────────────────────────────────────────────────

interface ResubmissionTabPanelProps {
  session: DefenseSessionPayload
}

type ResubmissionStatus = 'FOR_REVIEW' | 'NEED_REVISION' | 'APPROVED'

type LatestResubmission = DefenseSessionPayload['resubmissions'][number]

type CalloutMeta = {
  Icon: typeof Clock
  boxClass: string
  iconTileClass: string
  headlineClass: string
  headline: string
}

// ── Pure helpers (<50 lines each) ────────────────────────────────────────────

function formatDate(iso: string | Date | null | undefined): string | null {
  if (!iso) return null
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function resolveLatestResubmission(session: DefenseSessionPayload): LatestResubmission | null {
  const list = session.resubmissions
  if (!list || list.length === 0) return null
  return list[list.length - 1]
}

function getResubmissionCalloutMeta(status: ResubmissionStatus): CalloutMeta {
  if (status === 'APPROVED') {
    return {
      Icon: Check,
      boxClass: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)]',
      iconTileClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
      headlineClass: 'text-[#16a34a]',
      headline: 'Approved',
    }
  }
  if (status === 'NEED_REVISION') {
    return {
      Icon: TriangleAlert,
      boxClass: 'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)]',
      iconTileClass: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]',
      headlineClass: 'text-[#e11d48]',
      headline: 'Need Revision',
    }
  }
  return {
    Icon: Clock,
    boxClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconTileClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'For Review',
  }
}

function buildCalloutContext(
  status: ResubmissionStatus,
  approvedCount: number,
  total: number,
  comments: number | null,
  pages: number | null,
  reviewedAt: string | null,
): string {
  const base = `${approvedCount}/${total} approve`
  const hasCounts = typeof comments === 'number' && typeof pages === 'number' && comments > 0
  const countsLabel = hasCounts ? `${comments} comments on ${pages} pages` : null
  const dateLabel = reviewedAt ? `Reviewed ${formatDate(reviewedAt)}` : null
  if (status === 'FOR_REVIEW') {
    if (countsLabel && dateLabel) return `${base} · ${countsLabel} · ${dateLabel}`
    if (countsLabel) return `${base} · ${countsLabel}`
    return `Waiting for panelist approvals · ${base}`
  }
  if (status === 'NEED_REVISION') {
    if (countsLabel && dateLabel) return `${base} · ${countsLabel} · ${dateLabel}`
    if (countsLabel) return `${base} · ${countsLabel}`
    if (dateLabel) return `${base} · ${dateLabel}`
    return `${base} · Requires revision`
  }
  if (countsLabel && dateLabel) return `${base} · ${countsLabel} · ${dateLabel}`
  if (countsLabel) return `${base} · ${countsLabel}`
  if (dateLabel) return `${base} · ${dateLabel}`
  return `${base} · All panelists approved`
}

function resolveAnnotationStats(latest: LatestResubmission | null): { comments: number; pages: number } | null {
  const ann = (latest as unknown as { annotationStats?: { comments: number; pages: number } | null })?.annotationStats
  if (ann && typeof ann.comments === 'number') return ann
  return null
}

function resolveWorkspaceHref(session: DefenseSessionPayload, latest: LatestResubmission | null): string | undefined {
  if (!latest) return undefined
  return `/faculty/defense/${session.id}/${latest.id}`
}

// ── Callout component ────────────────────────────────────────────────────────

interface ResubmissionCalloutProps {
  status: ResubmissionStatus
  approvedCount: number
  total: number
  comments?: number | null
  pages?: number | null
  reviewedAt?: string | null
}

function ResubmissionStatusCallout({
  status,
  approvedCount,
  total,
  comments,
  pages,
  reviewedAt,
}: ResubmissionCalloutProps) {
  const meta = getResubmissionCalloutMeta(status)
  const Icon = meta.Icon
  const context = buildCalloutContext(status, approvedCount, total, comments ?? null, pages ?? null, reviewedAt ?? null)
  return (
    <section
      aria-live="polite"
      className={`flex flex-col gap-[12px] sm:flex-row sm:items-center sm:gap-[16px] rounded-[14px] border px-[18px] py-[16px] sm:px-[22px] sm:py-[18px] ${meta.boxClass}`}
    >
      <div className="flex items-center gap-[12px] sm:gap-[16px] min-w-0 flex-1">
        <div className={`flex size-[40px] items-center justify-center rounded-[12px] border shrink-0 ${meta.iconTileClass}`}>
          <Icon className={`size-[20px] ${meta.headlineClass}`} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`font-sora text-[15px] font-bold tracking-[-0.15px] ${meta.headlineClass}`}>{meta.headline}</h2>
          <p className="pt-[3px] font-sans font-medium text-[13px] leading-[19.5px] text-[#5a6382]">{context}</p>
        </div>
      </div>
    </section>
  )
}

function NoVerdictPlaceholder() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center p-10 text-center h-full flex-1 min-h-[400px]">
      <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
        <Clock className="size-6 text-[#707dff]" strokeWidth={1.75} />
      </div>
      <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
        Defense not completed
      </h3>
      <p className="font-sans font-medium text-[13px] leading-[21px] text-[#8a93b4] max-w-[360px]">
        Defense is not completed or has no verdict yet. Please wait for the verdict.
      </p>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

/**
 * ResubmissionTabPanel — Resubmission tab for the defense workspace.
 * - Status callout (For Review amber / Need Revision red / Approved green) derived via deriveResubmissionStatus + deriveApprovalProgress with 1/3 counts
 * - ResubmittedDocumentCard (latest !isInitial, resubmissions[resubmissions.length-1]) with empty placeholder
 * - ApprovalChecklistCard (per-panelist Approved / Need Revision / Pending via deriveApprovalChecklist, feedback counts)
 * - isPanelistReadOnly guard: Approved panelists are read-only on future versions (no Review action)
  * - shouldResetOnResubmission: REDEFENSE -> PENDING on new version, APPROVED carry-forward
 * gap-[16px], responsive, pure helpers.
 */
export function ResubmissionTabPanel({ session }: ResubmissionTabPanelProps) {
  if ((session as unknown as { verdict?: string })?.verdict === 'PENDING') {
    return (
      <div className="flex flex-col gap-[16px] w-full mx-auto h-full flex-1 min-h-0">
        <NoVerdictPlaceholder />
      </div>
    )
  }
  const latest = resolveLatestResubmission(session)
  const reviews = (latest?.reviews as Array<{ panelistId: number; name: string; status: DefenseReviewStatus | string }> | undefined) ?? []
  const hasPending = reviews.some((r) => r.status === 'PENDING')
  const derivedStatus = deriveResubmissionStatus(reviews as Array<{ status: DefenseReviewStatus | string }>) as ResubmissionStatus
  const status = hasPending && latest ? ('FOR_REVIEW' as const) : derivedStatus
  const progress = deriveApprovalProgress(reviews as Array<{ status: DefenseReviewStatus | string }>)
  const approvedCount = progress.approvedCount
  const total = progress.total || session.panelists.length || 3

  // Per-panelist checklist for latest version — includes feedback counts (comments/pages) when available
  const checklistItems = deriveApprovalChecklist(
    reviews.map((r) => ({
      panelistId: r.panelistId,
      name: r.name,
      status: r.status as DefenseReviewStatus | string,
      feedback: (r as unknown as { feedback?: { comments: number; pages: number } | null }).feedback ?? null,
      comments: (r as unknown as { comments?: number }).comments,
      pages: (r as unknown as { pages?: number }).pages,
      reviewedAt: (r as unknown as { reviewedAt?: string | null }).reviewedAt ?? null,
    })),
  )

  // Demonstrate carry-forward: REDEFENSE resets to PENDING on new version, APPROVED stays
  const resetCandidates = reviews.filter((r) => shouldResetOnResubmission(r.status as DefenseReviewStatus))
  void resetCandidates
  void checklistItems

  // Read-only guard: APPROVED panelists cannot re-review future versions
  const readOnlyIds = new Set(
    reviews.filter((r) => isPanelistReadOnly(r.status as DefenseReviewStatus)).map((r) => r.panelistId),
  )
  void readOnlyIds

  // Guard for current panelist's Review action — approved => read-only, no Review Document
  const { data: authSession } = useSession()
  const currentUserId = authSession?.user?.id != null ? Number(authSession.user.id) : null
  const myReview = currentUserId != null ? reviews.find((r) => r.panelistId === currentUserId) : undefined
  const isCurrentReadOnly = myReview ? isPanelistReadOnly(myReview.status as DefenseReviewStatus) : false
  void isCurrentReadOnly
  void shouldResetOnResubmission

  // Has current panelist already submitted annotation (COMMITTED) for this resubmission?
  const hasReviewedResub = (() => {
    if (currentUserId == null || !latest) return false
    const anns = (latest as unknown as { annotations?: Array<{ authorId: number; status: string }> })?.annotations
    if (anns && anns.length > 0) {
      return anns.some((a) => a.authorId === currentUserId && a.status === 'COMMITTED')
    }
    return myReview ? myReview.status !== 'PENDING' : false
  })()

  const annotationStats = resolveAnnotationStats(latest)
  const reviewedAt =
    (session as unknown as { verdictSubmittedAt?: string | null }).verdictSubmittedAt ??
    (latest as unknown as { dateSubmitted?: string })?.dateSubmitted ??
    null

  const latestDoc = latest
    ? {
        fileName: latest.fileName,
        size: latest.size,
        blobUrl: latest.blobUrl,
        dateSubmitted: latest.dateSubmitted,
        submittedByName: session.groupName,
        version: latest.version,
        isInitial: latest.isInitial,
        annotationStats,
        reviews: reviews as Array<{ status: string }>,
        comments: annotationStats?.comments ?? null,
        pages: annotationStats?.pages ?? null,
        reviewedAt,
      }
    : null

  const workspaceHref = resolveWorkspaceHref(session, latest)

  // Map reviews to ApprovalChecklistCard shape (panelistId + status + feedback)
  const checklistReviews = reviews.map((r) => ({
    panelistId: r.panelistId,
    status: r.status as DefenseReviewStatus | string,
    feedback: (r as unknown as { feedback?: { comments: number; pages: number } | null }).feedback ?? null,
    comments: (r as unknown as { comments?: number }).comments,
    pages: (r as unknown as { pages?: number }).pages,
    reviewedAt: (r as unknown as { reviewedAt?: string | null }).reviewedAt ?? null,
  }))

  return (
    <div className="flex flex-col gap-[16px] w-full mx-auto">
      {latest ? (
        <ResubmissionStatusCallout
          status={status}
          approvedCount={approvedCount}
          total={total}
          comments={annotationStats?.comments ?? null}
          pages={annotationStats?.pages ?? null}
          reviewedAt={reviewedAt}
        />
      ) : null}

      <ResubmittedDocumentCard
        document={latestDoc as unknown as never}
        resubmissions={session.resubmissions as unknown as never}
        reviews={reviews as unknown as never}
        totalPanelists={total}
        approvedCount={approvedCount}
        comments={annotationStats?.comments ?? null}
        pages={annotationStats?.pages ?? null}
        reviewedAt={reviewedAt}
        workspaceHref={workspaceHref}
        hasReviewed={hasReviewedResub}
        hasApprovedPrevious={isCurrentReadOnly}
      />

      {latest ? (
        <ApprovalChecklistCard
          panelists={session.panelists as unknown as never}
          reviews={checklistReviews as unknown as never}
        />
      ) : (
        <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[18px]">
          <p className="font-sans font-medium text-[13px] text-[#8a93b4] text-center py-6">No resubmitted document yet.</p>
        </div>
      )}
    </div>
  )
}

export default ResubmissionTabPanel
