'use client'

import { useState } from 'react'
import { DefenseSessionContextBar } from './DefenseSessionContextBar'
import { DefenseSessionPanelistView } from './DefenseSessionPanelistView'
import {
  DocumentHistoryDrawer,
  type DocumentHistoryItem,
} from '@/components/milestones/defense/DocumentHistoryDrawer'
import type { DefenseSessionPayload } from '@/lib/actions/defense'
import type { ResubmissionStatus } from '@/components/milestones/defense/DefenseDocumentCard'

interface DefenseSessionShellProps {
  session: DefenseSessionPayload
  backHref?: string
}

function deriveResubmissionStatus(
  reviews: { status: string }[],
): ResubmissionStatus {
  if (reviews.length === 0) return 'IN_REVIEW'
  if (reviews.some((r) => r.status === 'REJECTED')) return 'REJECTED'
  if (reviews.every((r) => r.status === 'APPROVED')) return 'APPROVED'
  return 'IN_REVIEW'
}

export function DefenseSessionShell({
  session,
  backHref = '/faculty/defense',
}: DefenseSessionShellProps) {
  const [historyOpen, setHistoryOpen] = useState(false)

  // Panelist session payload does not yet carry an initial document row
  // (the resubmissions array holds v2+ rows, initial doc lives via the
  // submission workflow). Show initial as null so the drawer renders its
  // empty state — same component, same behavior as the milestone bar.
  const initialItem: DocumentHistoryItem | null = null

  const resubmissionItems: DocumentHistoryItem[] = session.resubmissions.map(
    (r) => ({
      info: {
        fileName: r.fileName,
        size: r.size,
        submittedAt: r.dateSubmitted,
        blobUrl: r.blobUrl,
        submittedByName: session.groupName,
        version: r.version,
      },
      status: deriveResubmissionStatus(r.reviews) as ResubmissionStatus,
    }),
  )



  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DefenseSessionContextBar
        backHref={backHref}
        onDocumentHistory={() => setHistoryOpen(true)}
      />

      <div className="flex-1 min-h-0 p-[30px] flex flex-col">
        <DefenseSessionPanelistView session={session} />
      </div>

      <DocumentHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        initial={initialItem}
        resubmissions={resubmissionItems}
      />
    </div>
  )
}
