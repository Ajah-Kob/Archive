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

  // Initial document placeholder (when no resubmission, initial not in payload → show empty)
  const initialDoc = null as any

  return (
    <div className="flex flex-col gap-[16px] w-full mx-auto">
      <PanelistVerdictCallout state={verdictState as any} isChair={chair} />

      <DefenseDetailsCard schedule={session as any} />

      <LatestDocumentCard.Root>
        <LatestDocumentCard.Header>Defense Document</LatestDocumentCard.Header>
        <LatestDocumentCard.Body>
          {hasResubmission && latestResub ? (
            <LatestDocumentCard.Resubmitted
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
                comments: 4,
                pages: 3,
                reviewedAt: latestResub.dateSubmitted,
                previousVersionApproved: session.resubmissions.length > 1,
              }}
            />
          ) : initialDoc ? (
            <LatestDocumentCard.Initial
              document={initialDoc}
              status={session.verdict as any}
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
    </div>
  )
}
