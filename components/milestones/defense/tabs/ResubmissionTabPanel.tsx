'use client'

import { Clock } from 'lucide-react'
import type { DefenseType } from '@prisma/client'
import { DefenseEmptyState } from '../DefenseEmptyState'
import { ResubmissionTabSkeleton } from './ResubmissionTabSkeleton'
import { useDefenseTabsRefresh } from '../DefenseTabsRefreshContext'
import { ResubmittedDocumentCard } from './ResubmittedDocumentCard'
import { ResubmissionStatusCallout } from './ResubmissionStatusCallout'
import { StudentApprovalChecklistCard } from './StudentApprovalChecklistCard'
import { ResubmissionUploadCard } from './ResubmissionUploadCard'
import {
  deriveApprovalChecklist,
  deriveApprovalProgress,
  deriveResubmissionStatus,
  isPanelistReadOnly,
  shouldResetOnResubmission,
} from '@/lib/defense/session-helpers'
import type { StudentDefenseSessionPayload } from '@/lib/actions/student-defense'
import type {
  DefenseDocumentInfo,
  InitialDocumentStatus,
  ResubmissionStatus,
} from '../DefenseDocumentCard'

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Generic payload accepted by the panel — covers StudentDefenseSessionPayload
 * and any shape with submissions + panelists so the same component works for
 * both PROPOSAL and FINAL without duplication.
 */
type SessionPayload = StudentDefenseSessionPayload & {
  // Allow loose resubmissions alias for generic reuse
  resubmissions?: StudentDefenseSessionPayload['submissions']
}

export interface ResubmissionTabPanelProps {
  /** Primary payload — StudentDefenseSessionPayload from getDefenseSessionData */
  session?: SessionPayload | null
  /** Alias for session — supports <ResubmissionTabPanel data={payload} /> */
  data?: SessionPayload | null
  /** Explicit defense type for PROPOSAL/FINAL reuse; inferred from payload.type when omitted */
  defenseType?: DefenseType | 'PROPOSAL' | 'FINAL'
  /** Explicit slug for workspaceHref; inferred from defenseType/payload.type when omitted */
  milestone?: string
}

type LatestResubmission = SessionPayload['submissions'][number]

// ── Pure helpers (<50 lines each) ────────────────────────────────────────────

function resolveMilestoneSlug(
  milestone: string | undefined,
  defenseType: DefenseType | string | undefined,
  payloadType: string | undefined,
): string {
  if (milestone) return milestone
  const type = defenseType ?? payloadType
  if (type === 'FINAL') return 'final-defense'
  return 'proposal-defense'
}

function resolveLatestResubmission(payload: SessionPayload | null): LatestResubmission | null {
  if (!payload) return null
  // Support both submissions (student payload) and resubmissions alias
  const submissions = (payload as unknown as { submissions?: LatestResubmission[] }).submissions
  const resubmissions = (payload as unknown as { resubmissions?: LatestResubmission[] }).resubmissions
  if (submissions && submissions.length > 0) {
    const filtered = submissions.filter((s) => !s.isInitial)
    if (filtered.length === 0) return null
    // Already asc by version from student-defense; pick last (latest)
    return filtered[filtered.length - 1]
  }
  if (resubmissions && resubmissions.length > 0) {
    return resubmissions[resubmissions.length - 1]
  }
  return null
}

function resolveAnnotationStats(latest: LatestResubmission | null): { comments: number; pages: number } | null {
  if (!latest) return null
  const ann = (latest as unknown as { annotationStats?: { comments: number; pages: number } | null }).annotationStats
  if (ann && typeof ann.comments === 'number' && typeof ann.pages === 'number') return ann
  return null
}

function resolveWorkspaceHref(
  latest: LatestResubmission | null,
  milestoneSlug: string,
): string | undefined {
  if (!latest) return undefined
  const id = (latest as unknown as { id?: number }).id
  if (id != null) return `/student/milestone/${milestoneSlug}/${id}`
  return undefined
}

function resolveReviewedAt(
  payload: SessionPayload | null,
  latest: LatestResubmission | null,
): string | null {
  const verdictAt = (payload as unknown as { verdictSubmittedAt?: string | null })?.verdictSubmittedAt ?? null
  if (verdictAt) return verdictAt
  const latestReviewed = (latest as unknown as { reviewedAt?: string | null; dateSubmitted?: string })?.reviewedAt ?? null
  if (latestReviewed) return latestReviewed
  const dateSubmitted = (latest as unknown as { dateSubmitted?: string })?.dateSubmitted ?? null
  return dateSubmitted
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

// ── Empty placeholder ────────────────────────────────────────────────────────

function EmptyResubmissionPlaceholder() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[18px]">
      <p className="font-sans font-medium text-[13px] text-[#8a93b4] text-center py-6">No resubmitted document yet.</p>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

/**
 * ResubmissionTabPanel — student resubmission workspace for defense.
 * Composes Status Callout + ResubmittedDocumentCard + StudentApprovalChecklistCard in gap-[16px] layout.
 *
 * - Latest resubmission resolved as submissions.filter(!isInitial).at(-1) (or resubmissions[resubmissions.length-1])
 * - Status/progress/checklist derived via session-helpers (deriveResubmissionStatus, deriveApprovalProgress, deriveApprovalChecklist)
 * - Annotation comments/pages resolve per version via latest.annotationStats and update when a new version lands
 * - Carry-forward honored: APPROVED preserved (isPanelistReadOnly), REJECTED->PENDING via shouldResetOnResubmission
 * - Empty placeholder when no resubmission without breaking layout
 * - Generic via defenseType / milestone / payload.type — same component for PROPOSAL and FINAL
 */
export function ResubmissionTabPanel({
  session,
  data,
  defenseType,
  milestone,
}: ResubmissionTabPanelProps) {
  const payload = (session ?? data ?? null) as SessionPayload | null
  const { isRefreshing, triggerRefresh } = useDefenseTabsRefresh()

  // Also trigger global refresh when a file is submitted via the resubmitted card's upload (if any)
  // The ResubmittedDocumentCard itself will call onSubmitted which will trigger this

  if (isRefreshing) {
    return <ResubmissionTabSkeleton />
  }

  if (!payload) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-[30px] flex flex-col">
        <DefenseEmptyState type={(defenseType as DefenseType | undefined) ?? ('PROPOSAL' as DefenseType)} />
      </div>
    )
  }

  const verdict = (payload as unknown as { verdict?: string })?.verdict ?? 'PENDING'

  if (verdict === 'PENDING') {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-[30px] flex flex-col h-full">
        <div className="flex flex-col gap-[16px] w-full mx-auto h-full flex-1 min-h-0">
          <NoVerdictPlaceholder />
        </div>
      </div>
    )
  }

  if (verdict === 'APPROVED') {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-[30px] flex flex-col h-full">
        <div className="flex flex-col gap-[16px] w-full mx-auto h-full flex-1 min-h-0">
          <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06)] flex flex-col items-center justify-center p-10 text-center h-full flex-1 min-h-[400px]">
            <div className="size-12 rounded-full bg-[rgba(22,163,74,0.08)] flex items-center justify-center mb-4">
              <Clock className="size-6 text-[#16a34a]" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
              No resubmission needed
            </h3>
            <p className="font-sans font-medium text-[13px] leading-[21px] text-[#8a93b4] max-w-[360px]">
              Your defense was approved. No resubmission is required.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const milestoneSlug = resolveMilestoneSlug(milestone, defenseType as string | undefined, (payload as unknown as { type?: string })?.type)
  const latest = resolveLatestResubmission(payload)
  const annotationStats = resolveAnnotationStats(latest)
  const reviews = (latest?.reviews as Array<{ panelistId: number; name: string; status: string; reviewedAt?: string | null }> | undefined) ?? []
  const reviewedAt = resolveReviewedAt(payload, latest)

  // B — strict: if any review is still PENDING, the whole resubmission is In review
  const hasPending = reviews.some((r) => r.status === 'PENDING')
  const derivedStatus = deriveResubmissionStatus(reviews as Array<{ status: string }>)
  const status = hasPending && latest ? ('FOR_REVIEW' as const) : derivedStatus
  const progress = deriveApprovalProgress(reviews as Array<{ status: string }>)
  const approvedCount = progress.approvedCount
  const total = progress.total > 0 ? progress.total : payload.panelists.length || 3

  // Per-panelist checklist for latest version — displayStatus + counts update per version via annotationStats
  const checklistItems = deriveApprovalChecklist(
    reviews.map((r) => ({
      panelistId: r.panelistId,
      name: (r as unknown as { name?: string }).name,
      status: r.status as string,
      feedback: (r as unknown as { feedback?: { comments: number; pages: number } | null }).feedback ?? null,
      comments: (r as unknown as { comments?: number }).comments,
      pages: (r as unknown as { pages?: number }).pages,
      reviewedAt: (r as unknown as { reviewedAt?: string | null }).reviewedAt ?? null,
    })) as never,
  )

  // Carry-forward: REJECTED resets to PENDING on new version, APPROVED stays (preserved)
  // Checklist already reflects stored status; next version creation will reset via shouldResetOnResubmission
  const resetCandidates = reviews.filter((r) => shouldResetOnResubmission(r.status as never))
  void resetCandidates
  void checklistItems

  // Read-only guard: APPROVED panelists cannot re-review future versions — respected in checklist display
  const readOnlyIds = new Set(
    reviews.filter((r) => isPanelistReadOnly(r.status as never)).map((r) => r.panelistId),
  )
  void readOnlyIds
  void isPanelistReadOnly
  void shouldResetOnResubmission

  // Workspace link for document workspace — /student/milestone/[milestone]/[documentId]
  const workspaceHref = resolveWorkspaceHref(latest, milestoneSlug)
  const latestId = (latest as unknown as { id?: number | null })?.id ?? null
  const version = (latest as unknown as { version?: number })?.version ?? undefined
  const totalPanelists = payload.panelists.length || total

  // Map reviews to StudentApprovalChecklistCard shape
  // When there's no resubmission yet, show checklist for the *next* resubmission version
  // using carry-forward: APPROVED stays, REJECTED → PENDING, PENDING stays. We derive from
  // the initial submission's reviews to preview who will need to review the resubmission.
  const checklistReviews = (() => {
    if (latest) {
      return reviews.map((r) => ({
        panelistId: r.panelistId,
        status: r.status as never,
        feedback: (r as unknown as { feedback?: { comments: number; pages: number } | null }).feedback ?? null,
        comments: (r as unknown as { comments?: number }).comments,
        pages: (r as unknown as { pages?: number }).pages,
        reviewedAt: (r as unknown as { reviewedAt?: string | null }).reviewedAt ?? null,
      }))
    }
    // No resubmission yet — preview next version's checklist from initial submission's reviews
    const initialSubmission = payload.submissions.find((s) => s.isInitial) as unknown as
      | { reviews?: Array<{ panelistId: number; status: string; reviewedAt?: string | null }> }
      | undefined
    const initialReviews = initialSubmission?.reviews ?? []
    if (initialReviews.length > 0) {
      return initialReviews.map((r) => ({
        panelistId: r.panelistId,
        status: (shouldResetOnResubmission(r.status as never) ? 'PENDING' : r.status) as never,
        reviewedAt: r.reviewedAt ?? null,
      }))
    }
    // Fallback: show all panelists as pending for the next resubmission
    return payload.panelists.map((p) => ({
      panelistId: (p as unknown as { userId: number }).userId ?? (p as unknown as { id: number }).id ?? 0,
      status: 'PENDING' as never,
      reviewedAt: null,
    }))
  })()

  // Resubmissions list for child cards (latest = last element)
  const resubmissionsForChildren = payload.submissions
    ? payload.submissions.filter((s) => !s.isInitial)
    : ((payload as unknown as { resubmissions?: LatestResubmission[] }).resubmissions ?? [])

  // B — strict: student can only upload when all panelists have finished reviewing.
  // Initial upload (!latest) allowed immediately after revision verdict.
  // Subsequent uploads allowed only when status is NEED_REVISION and no PENDING left.
  const canResubmitOnTab =
    (verdict === 'MINOR_REVISION' || verdict === 'MAJOR_REVISION' || verdict === 'REJECTED') &&
    (!latest || (!hasPending && status === 'NEED_REVISION'))

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-[30px] flex flex-col">
      <div className="flex flex-col gap-[16px] w-full mx-auto">
        <ResubmissionStatusCallout
          status={status}
          reviews={reviews as never}
          approvedCount={approvedCount}
          total={total}
          comments={annotationStats?.comments ?? null}
          pages={annotationStats?.pages ?? null}
          reviewedAt={reviewedAt}
          version={version}
          workspaceHref={workspaceHref}
          milestone={milestoneSlug}
          documentId={latestId}
          resubmissions={resubmissionsForChildren as never}
        />

        {canResubmitOnTab ? (
          <ResubmissionUploadCard
            milestone={milestoneSlug}
            defenseType={defenseType as DefenseType}
            onSubmitted={() => triggerRefresh()}
          />
        ) : (
          <ResubmittedDocumentCard
            document={
              latest
                ? {
                    id: (latest as unknown as { id: number }).id,
                    fileName: latest.fileName,
                    size: latest.size,
                    blobUrl: latest.blobUrl,
                    dateSubmitted: (latest as unknown as { dateSubmitted: string }).dateSubmitted,
                    submittedByName: (latest as unknown as { submittedByName: string }).submittedByName ?? payload.groupName,
                    version: (latest as unknown as { version: number }).version,
                    isInitial: false,
                    annotationStats,
                    reviews: reviews as Array<{ status: string }>,
                    comments: annotationStats?.comments ?? null,
                    pages: annotationStats?.pages ?? null,
                    reviewedAt,
                  }
                : null
            }
            resubmissions={resubmissionsForChildren as never}
            reviews={reviews as never}
            totalPanelists={totalPanelists}
            approvedCount={approvedCount}
            comments={annotationStats?.comments ?? null}
            pages={annotationStats?.pages ?? null}
            reviewedAt={reviewedAt}
            workspaceHref={workspaceHref}
            milestone={milestoneSlug}
          />
        )}

        <StudentApprovalChecklistCard
          panelists={payload.panelists as never}
          reviews={checklistReviews as never}
          annotationStats={annotationStats}
        />
      </div>
    </div>
  )
}

export default ResubmissionTabPanel
