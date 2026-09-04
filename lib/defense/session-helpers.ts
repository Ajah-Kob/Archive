// Pure helpers for the defense panelist session view (Figma 1428-12746, 1470-5094).
// No DB, no side effects, no `!` assertions — small pure functions only.

import type {
  DefenseReviewStatus,
  DefenseVerdict,
  PanelistRole,
} from '@prisma/client'

// ── Verdict callout 6-state union ─────────────────────────────────────────────

/**
 * 6 explicit states used by the panelist Verdict Callout.
 * - awaiting-chair: verdict PENDING and the current panelist IS the chair
 * - awaiting-non-chair: verdict PENDING and the current panelist is NOT the chair
 * - approved / minor_revision / major_revision / rejected: final verdicts
 *
 * The awaiting split is the only chair/non-chair distinction; the 4 verdict
 * states are identical regardless of role.
 */
export type DefenseVerdictCalloutState =
  | 'awaiting-chair'
  | 'awaiting-non-chair'
  | 'approved'
  | 'minor_revision'
  | 'major_revision'
  | 'rejected'

// Backwards-compatible alias used by earlier prose.
export type VerdictCalloutPanelistState = DefenseVerdictCalloutState

/**
 * Whether the given panel role is the chair.
 * Single place to encode the role check so the UI never branches on raw strings.
 */
export function isChair(role: PanelistRole): boolean {
  return role === 'CHAIR'
}

/**
 * Maps a DefenseSchedule.verdict + isChair flag to one of the 6 explicit
 * callout states. Pure, no DB, no `!`.
 */
export function deriveVerdictCalloutState(
  verdict: DefenseVerdict,
  isChairValue: boolean,
): DefenseVerdictCalloutState {
  if (verdict === 'PENDING') {
    return isChairValue ? 'awaiting-chair' : 'awaiting-non-chair'
  }
  switch (verdict) {
    case 'APPROVED':
      return 'approved'
    case 'MINOR_REVISION':
      return 'minor_revision'
    case 'MAJOR_REVISION':
      return 'major_revision'
    case 'REJECTED':
      return 'rejected'
    default:
      return isChairValue ? 'awaiting-chair' : 'awaiting-non-chair'
  }
}

// Aliases required by the subtask prose — same implementation.
export const deriveVerdictState = deriveVerdictCalloutState
export const deriveVerdictCalloutStateForPanelist = deriveVerdictCalloutState

// ── Feedback text (Figma 1470-5094) ──────────────────────────────────────────

/**
 * Derives the center feedback text for a panelist row (panelist → panelist view).
 * - Has COMMITTED annotations → "✓ Finished reviewing" (counts if available)
 * - Has DRAFT (auto-save) but not COMMITTED → "Draft — not submitted" (so peers know it's not final)
 * - No row yet → "Pending review"
 * verDict param kept for compat but no longer gates PENDING alone.
 */
export function deriveFeedbackText(
  verdict: DefenseVerdict,
  feedback: { comments: number; pages: number; hasCommitted?: boolean; hasDraft?: boolean } | null | undefined,
): string {
  if (feedback && (feedback.hasCommitted || feedback.comments > 0)) {
    if (feedback.comments > 0) return `✓ Feedback submitted · ${feedback.comments} comments on ${feedback.pages} pages`
    return '✓ Feedback submitted'
  }
  if (feedback && feedback.hasDraft) return 'Draft — not submitted'
  return 'No feedback submitted yet'
}

// ── Approval progress (resubmissions) ────────────────────────────────────────

export interface ApprovalProgress {
  approvedCount: number
  total: number
  label: string
}

/**
 * Counts how many DefenseSubmissionReview rows are APPROVED without leaking any
 * review content. Returns approvedCount/total and a display label e.g. "1/3".
 *
 * Unified model — accepts DefenseReviewStatus rows, or any array with a
 * `status: string` field — only `APPROVED` is counted.
 */
export function deriveApprovalProgress(
  reviews: Array<{
    status: DefenseReviewStatus | string
  }>,
): ApprovalProgress {
  const total = reviews.length
  const approvedCount = reviews.filter((r) => r.status === 'APPROVED').length
  return { approvedCount, total, label: `${approvedCount}/${total}` }
}

// Aliases required by subtask prose.
export const deriveResubmissionApprovalProgress = deriveApprovalProgress
export const deriveApprovalProgressForResubmission = deriveApprovalProgress

// ── Feedback gating helpers ──────────────────────────────────────────────────

/**
 * Whether the current verdict allows feedback counts to be shown.
 * The UI gate is verdict !== PENDING; private annotation content is never
 * exposed, only counts.
 */
export function shouldExposeFeedback(verdict: DefenseVerdict): boolean {
  return verdict !== 'PENDING'
}

/**
 * Resolves the feedback counts that may be rendered for a panelist.
 * Returns the counts only when the verdict gate is open; otherwise null.
 * Backend-ready: when the document workspace ships, callers will pass real
 * aggregated { comments, pages } counts here — no content is leaked.
 */
export function resolvePanelistFeedback(
  verdict: DefenseVerdict,
  feedback: { comments: number; pages: number } | null | undefined,
): { comments: number; pages: number } | null {
  if (verdict === 'PENDING') return null
  if (
    feedback &&
    typeof feedback.comments === 'number' &&
    typeof feedback.pages === 'number'
  ) {
    return { comments: feedback.comments, pages: feedback.pages }
  }
  return null
}

// ── Resubmission helpers (defense-tabs — pure, no DB) ────────────────────────

export type ResubmissionStatus = 'FOR_REVIEW' | 'NEED_REVISION' | 'APPROVED'
export type ResubmissionCalloutState = ResubmissionStatus

/**
 * Derives resubmission status from per-panelist reviews.
 * - empty -> FOR_REVIEW
 * - any REJECTED -> NEED_REVISION
 * - all APPROVED -> APPROVED
 * - else -> FOR_REVIEW (any PENDING)
 * Pure, no throws.
 */
export function deriveResubmissionStatus(
  reviews: Array<{ status: DefenseReviewStatus | string }> | null | undefined,
): ResubmissionStatus {
  if (!reviews || reviews.length === 0) return 'FOR_REVIEW'
  const hasRejected = reviews.some((r) => r.status === 'REJECTED')
  if (hasRejected) return 'NEED_REVISION'
  const allApproved = reviews.every((r) => r.status === 'APPROVED')
  if (allApproved) return 'APPROVED'
  return 'FOR_REVIEW'
}

/**
 * Callout variant for the latest resubmission version.
 * Delegates to deriveResubmissionStatus — same business rule.
 */
export function deriveResubmissionCalloutState(
  reviews: Array<{ status: DefenseReviewStatus | string }> | null | undefined,
): ResubmissionCalloutState {
  return deriveResubmissionStatus(reviews)
}

// Alias for prose variants.
export const deriveResubmissionCalloutVariant = deriveResubmissionCalloutState
export const getResubmissionStatus = deriveResubmissionStatus

/**
 * Whether a panelist is read-only on future resubmission versions.
 * Business rule: APPROVED panelists cannot re-review future versions.
 * - status APPROVED + isFutureVersion true (or omitted) -> true
 * - otherwise -> false
 * Also accepts a review object as first arg.
 */
export function isPanelistReadOnly(
  statusOrReview: DefenseReviewStatus | string | { status: DefenseReviewStatus | string },
  isFutureVersionOrContext?: boolean | number | { isFutureVersion?: boolean; currentVersion?: number; latestVersion?: number },
  latestVersion?: number,
): boolean {
  const status =
    typeof statusOrReview === 'object' && statusOrReview !== null && 'status' in statusOrReview
      ? (statusOrReview as { status: DefenseReviewStatus | string }).status
      : (statusOrReview as DefenseReviewStatus | string)
  if (status !== 'APPROVED') return false
  if (typeof isFutureVersionOrContext === 'boolean') return isFutureVersionOrContext
  if (typeof isFutureVersionOrContext === 'object' && isFutureVersionOrContext !== null) {
    const ctx = isFutureVersionOrContext as { isFutureVersion?: boolean; currentVersion?: number; latestVersion?: number }
    if (typeof ctx.isFutureVersion === 'boolean') return ctx.isFutureVersion
    if (typeof ctx.currentVersion === 'number' && typeof ctx.latestVersion === 'number') {
      return ctx.currentVersion < ctx.latestVersion
    }
  }
  if (typeof isFutureVersionOrContext === 'number' && typeof latestVersion === 'number') {
    return isFutureVersionOrContext < latestVersion
  }
  return true
}

/**
 * Whether a review should reset to PENDING on new version creation.
 * - REJECTED -> true (reset to PENDING)
 * - APPROVED -> false (carry-forward, stays APPROVED)
 * - PENDING/other -> false (already pending)
 * Carry-forward only unresolved.
 */
export function shouldResetOnResubmission(
  statusOrReview: DefenseReviewStatus | string | { status: DefenseReviewStatus | string },
): boolean {
  const status =
    typeof statusOrReview === 'object' && statusOrReview !== null && 'status' in statusOrReview
      ? (statusOrReview as { status: DefenseReviewStatus | string }).status
      : (statusOrReview as DefenseReviewStatus | string)
  return status === 'REJECTED'
}

// Alias for carry-forward prose.
export const shouldResetReviewOnResubmission = shouldResetOnResubmission

export interface ApprovalChecklistItem {
  panelistId: number
  name?: string
  status: DefenseReviewStatus | string
  displayStatus: 'Approved' | 'Need Revision' | 'Pending'
  comments: number
  pages: number
  reviewedAt: string | null
  isReadOnly: boolean
}

/**
 * Builds per-panelist checklist for latest resubmission version.
 * Maps each review to displayStatus + feedback counts.
 * Approved -> Approved (read-only), Rejected -> Need Revision, else Pending.
 * Pure, no throws.
 */
export function deriveApprovalChecklist(
  reviews: Array<{
    panelistId?: number
    id?: number
    panelist_id?: number
    name?: string
    panelistName?: string
    status: DefenseReviewStatus | string
    feedback?: { comments: number; pages: number } | null
    comments?: number
    pages?: number
    reviewedAt?: string | Date | null
    reviewed_at?: string | Date | null
  }> | null | undefined,
): ApprovalChecklistItem[] {
  if (!reviews || reviews.length === 0) return []
  return reviews.map((r) => {
    const panelistId = r.panelistId ?? r.id ?? (r as { panelist_id?: number }).panelist_id ?? 0
    const name = r.name ?? r.panelistName ?? undefined
    const status = r.status
    const displayStatus =
      status === 'APPROVED' ? 'Approved' : status === 'REJECTED' ? 'Need Revision' : 'Pending'
    const fb = r.feedback
    const comments =
      fb && typeof fb.comments === 'number'
        ? fb.comments
        : typeof r.comments === 'number'
          ? r.comments
          : 0
    const pages =
      fb && typeof fb.pages === 'number'
        ? fb.pages
        : typeof r.pages === 'number'
          ? r.pages
          : 0
    const rawAt = r.reviewedAt ?? r.reviewed_at ?? null
    const reviewedAt =
      rawAt instanceof Date ? rawAt.toISOString() : typeof rawAt === 'string' ? rawAt : null
    return {
      panelistId,
      name,
      status,
      displayStatus,
      comments,
      pages,
      reviewedAt,
      isReadOnly: isPanelistReadOnly(status),
    }
  })
}

// Aliases for checklist prose.
export const getApprovalChecklist = deriveApprovalChecklist
export const buildApprovalChecklist = deriveApprovalChecklist
