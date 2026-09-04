'use client'

import { DefenseDetailsCard } from '@/components/milestones/defense/DefenseDetailsCard'
import { PanelistVerdictCallout } from '@/components/milestones/defense/VerdictCallout'
import { LatestDocumentCard } from '@/components/defense/LatestDocumentCard'
import {
  deriveVerdictCalloutState,
  isChair,
} from '@/lib/defense/session-helpers'
import type { DefenseSessionPayload, DefenseSchedulePayload } from '@/lib/actions/defense'
import type { PanelistVerdictState } from '@/components/milestones/defense/verdict-callout-variants'

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionTabPanelProps {
  session: DefenseSessionPayload
}

type InitialSubmission = {
  id: number
  isInitial: boolean
  fileName: string
  size: number
  blobUrl: string
  dateSubmitted: string
  version: number
  annotationStats?: { comments: number; pages: number } | null
}

// ── Pure helpers (<50 lines each) ────────────────────────────────────────────

function resolveInitialSubmission(
  session: DefenseSessionPayload,
): InitialSubmission | null {
  const submissions = (
    session as unknown as {
      submissions?: InitialSubmission[]
    }
  ).submissions
  if (!submissions || submissions.length === 0) return null
  return submissions.find((s) => s.isInitial) ?? null
}

function resolveInitialAnnotationStats(
  initial: InitialSubmission | null,
  fallback: { comments: number; pages: number } | null | undefined,
): { comments: number; pages: number } | null {
  if (initial?.annotationStats) return initial.annotationStats
  if (fallback && typeof fallback.comments === 'number') return fallback
  return null
}

function resolveReviewedAt(
  annotationStats: { comments: number; pages: number } | null,
  verdictSubmittedAt: string | null | undefined,
): string | null {
  if (!annotationStats) return null
  return verdictSubmittedAt ?? null
}

function buildInitialDocument(
  initial: InitialSubmission,
  session: DefenseSessionPayload,
  annotationStats: { comments: number; pages: number } | null,
  reviewedAt: string | null,
) {
  return {
    fileName: initial.fileName,
    size: initial.size,
    blobUrl: initial.blobUrl,
    submittedAt: initial.dateSubmitted,
    submittedByName: session.groupName,
    version: initial.version,
    status: session.verdict,
    comments: annotationStats?.comments ?? null,
    pages: annotationStats?.pages ?? null,
    reviewedAt,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * SessionTabPanel — Session tab for the defense workspace (Figma 1428-12746).
 * - Verdict callout 6-state via deriveVerdictCalloutState + isChair
 * - DefenseDetails (Schedule + Panelists + Members) via DefenseDetailsCard composition
 * - LatestDocument shows initial document only (submissions.find isInitial, v1)
 *   with workspaceHref from initialSubmission.id
 * - Feedback indicator pinned to v1 initial (annotationStats from initial only)
 * - Empty state when no initial document
 * gap-[16px], responsive, pure helpers.
 */
export function SessionTabPanel({ session }: SessionTabPanelProps) {
  const chair = isChair(session.myRole)
  const verdictState = deriveVerdictCalloutState(session.verdict, chair)

  const initialSubmission = resolveInitialSubmission(session)

  const topLevelStats = (
    session as unknown as {
      annotationStats?: { comments: number; pages: number } | null
    }
  ).annotationStats

  // Feedback indicator pinned to v1 initial — never reset on resubmission
  const annotationStats = resolveInitialAnnotationStats(
    initialSubmission,
    topLevelStats,
  )

  const verdictSubmittedAt =
    (
      session as unknown as {
        verdictSubmittedAt?: string | null
      }
    ).verdictSubmittedAt ?? null

  const reviewedAt = resolveReviewedAt(annotationStats, verdictSubmittedAt)

  const initialDoc = initialSubmission
    ? buildInitialDocument(
        initialSubmission,
        session,
        annotationStats,
        reviewedAt,
      )
    : null

  const workspaceHref = initialSubmission
    ? `/faculty/defense/${session.id}/${initialSubmission.id}`
    : undefined

  return (
    <div className="flex flex-col gap-[16px] w-full mx-auto">
      <PanelistVerdictCallout
        state={verdictState as unknown as PanelistVerdictState}
        isChair={chair}
        scheduleId={session.id}
        reviewedAt={reviewedAt}
        comments={annotationStats?.comments ?? null}
        pages={annotationStats?.pages ?? null}
      />

      <LatestDocumentCard.Root>
        <LatestDocumentCard.Header>Latest Document</LatestDocumentCard.Header>
        <LatestDocumentCard.Body>
          {initialDoc ? (
            <LatestDocumentCard.Initial
              document={initialDoc}
              status={session.verdict as unknown as string}
              workspaceHref={workspaceHref}
            />
          ) : (
            <div className="py-8 text-center">
              <p className="font-sans font-medium text-[13px] text-[#8a93b4]">
                No document has been submitted for this defense yet.
              </p>
            </div>
          )}
        </LatestDocumentCard.Body>
      </LatestDocumentCard.Root>

      <DefenseDetailsCard schedule={session as unknown as DefenseSchedulePayload & { members?: { userId: number; name: string; email: string; image: string | null; isLeader: boolean }[] }} />
    </div>
  )
}

export default SessionTabPanel
