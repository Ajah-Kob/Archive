// Pure helpers for the defense panelist session view (Figma 1428-12746, 1470-5094).
// No DB, no side effects, no `!` assertions — small pure functions only.

import type {
  DefenseReviewStatus,
  DefenseResubmissionStatus,
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
 * Derives the center feedback text for a panelist row.
 * Gate: PENDING never exposes feedback, even when a feedback object is present.
 * Otherwise: feedback ? "X comments on Y pages" : "No feedback and verdict yet".
 *
 * Counts only — never the private annotation content.
 */
export function deriveFeedbackText(
  verdict: DefenseVerdict,
  feedback: { comments: number; pages: number } | null | undefined,
): string {
  if (verdict === 'PENDING') {
    return 'No feedback and verdict yet'
  }
  if (
    feedback &&
    typeof feedback.comments === 'number' &&
    typeof feedback.pages === 'number'
  ) {
    return `${feedback.comments} comments on ${feedback.pages} pages`
  }
  return 'No feedback and verdict yet'
}

// ── Approval progress (resubmissions) ────────────────────────────────────────

export interface ApprovalProgress {
  approvedCount: number
  total: number
  label: string
}

/**
 * Counts how many DefenseSubmissionReview / DefenseResubmissionReview rows are
 * APPROVED without leaking any review content. Returns approvedCount/total
 * and a display label e.g. "1/3".
 *
 * Accepts either DefenseReviewStatus or DefenseResubmissionStatus rows, or any
 * array with a `status: string` field — only `APPROVED` is counted.
 */
export function deriveApprovalProgress(
  reviews: Array<{
    status: DefenseReviewStatus | DefenseResubmissionStatus | string
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
