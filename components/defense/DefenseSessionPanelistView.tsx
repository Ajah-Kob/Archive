'use client'

import { DefenseDetailsCard } from '@/components/milestones/defense/DefenseDetailsCard'
import { PanelistVerdictCallout } from '@/components/milestones/defense/VerdictCallout'
import { LatestDocumentCard } from '@/components/defense/LatestDocumentCard'
import {
  deriveVerdictCalloutState,
  isChair,
} from '@/lib/defense/session-helpers'
import type { DefenseSessionPayload } from '@/lib/actions/defense'

interface DefenseSessionPanelistViewProps {
  session: DefenseSessionPayload
}

export function DefenseSessionPanelistView({
  session,
}: DefenseSessionPanelistViewProps) {
  const chair = isChair(session.myRole)
  const verdictState = deriveVerdictCalloutState(session.verdict, chair)

  // Latest document: resubmissions hold v2+; initial (v1) not yet in payload → treat last resubmission as latest if exists
  const latestResub =
    session.resubmissions.length > 0
      ? session.resubmissions[session.resubmissions.length - 1]
      : null
  const hasResubmission = !!latestResub

  // Global 1/3 for resubmitted: approvedCount from reviews
  const approvedCount = latestResub
    ? latestResub.reviews.filter((r) => r.status === 'APPROVED').length
    : 0
  const totalPanelists = session.panelists.length || 3

  // Map resubmission status to Latest card status: use first review status or derive from verdict? For now map reviews
  // PENDING reviews → FOR_REVIEW, all APPROVED → APPROVED, any REJECTED → NEED_REVISION
  function deriveResubStatus(
    reviews: { status: string }[],
  ): 'FOR_REVIEW' | 'APPROVED' | 'NEED_REVISION' {
    if (reviews.length === 0) return 'FOR_REVIEW'
    if (reviews.every((r) => r.status === 'APPROVED')) return 'APPROVED'
    if (reviews.some((r) => r.status === 'REJECTED')) return 'NEED_REVISION'
    return 'FOR_REVIEW'
  }

  const resubStatus = latestResub
    ? deriveResubStatus(latestResub.reviews)
    : 'FOR_REVIEW'

  const annotationStats =
    (
      session as unknown as {
        annotationStats?: { comments: number; pages: number } | null
      }
    ).annotationStats ?? null
  const reviewedAt =
    (session as unknown as { verdictSubmittedAt?: string | null })
      .verdictSubmittedAt ?? null

  const initialSubmission =
    (
      session as unknown as {
        submissions?: Array<{
          id: number
          isInitial: boolean
          fileName: string
          size: number
          blobUrl: string
          dateSubmitted: string
          version: number
        }>
      }
    ).submissions?.find((s) => s.isInitial) ?? null
  const initialDoc = initialSubmission
    ? {
        fileName: initialSubmission.fileName,
        size: initialSubmission.size,
        blobUrl: initialSubmission.blobUrl,
        submittedAt: initialSubmission.dateSubmitted,
        submittedByName: session.groupName,
        version: initialSubmission.version,
        status: session.verdict,
        comments: annotationStats?.comments ?? null,
        pages: annotationStats?.pages ?? null,
        reviewedAt: reviewedAt ?? null,
      }
    : null
  const hasDocument = !!initialDoc || hasResubmission

  return (
    <div className="flex flex-col gap-[16px] w-full mx-auto">
      <PanelistVerdictCallout
        state={verdictState as any}
        isChair={chair}
        scheduleId={session.id}
        reviewedAt={reviewedAt}
        comments={annotationStats?.comments ?? null}
        pages={annotationStats?.pages ?? null}
      />

      <LatestDocumentCard.Root>
        <LatestDocumentCard.Header>Latest Document</LatestDocumentCard.Header>
        <LatestDocumentCard.Body>
          {hasResubmission && latestResub ? (
            <LatestDocumentCard.Resubmitted
              workspaceHref={`/faculty/defense/${session.id}/${latestResub.id}`}
              document={{
                fileName: latestResub.fileName,
                size: latestResub.size,
                blobUrl: latestResub.blobUrl,
                submittedAt: latestResub.dateSubmitted,
                submittedByName: session.groupName,
                version: latestResub.version,
                status: resubStatus,
                approvedCount,
                totalPanelists,
                comments: annotationStats?.comments ?? 0,
                pages: annotationStats?.pages ?? 0,
                reviewedAt: reviewedAt ?? latestResub.dateSubmitted,
                previousVersionApproved: session.resubmissions.length > 1,
              }}
            />
          ) : initialDoc ? (
            <LatestDocumentCard.Initial
              document={initialDoc}
              status={session.verdict as any}
              workspaceHref={
                initialSubmission
                  ? `/faculty/defense/${session.id}/${initialSubmission.id}`
                  : undefined
              }
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

      <DefenseDetailsCard schedule={session as any} />
    </div>
  )
}
