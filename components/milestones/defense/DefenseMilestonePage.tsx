'use client'

import { useState } from 'react'
import type { StudentDefenseSessionPayload } from '@/lib/actions/student-defense'
import type { DefenseType } from '@prisma/client'
import { GroupContext } from '@/components/milestones/GroupContext'
import { DefenseMilestoneView } from './DefenseMilestoneView'
import { DefenseEmptyState } from './DefenseEmptyState'
import {
  DocumentHistoryDrawer,
  type DocumentHistoryItem,
} from './DocumentHistoryDrawer'
import type {
  InitialDocumentStatus,
  ResubmissionStatus,
} from './DefenseDocumentCard'

interface DefenseMilestonePageProps {
  data: StudentDefenseSessionPayload | null
  defenseType: DefenseType
}

/**
 * Client wrapper for the defense milestone page.
 *
 * Owns the Document History drawer open state and coordinates the context bar
 * button (rendered via GroupContext) with the drawer. Splits the session
 * payload into the initial document + resubmission history for the drawer.
 */
export function DefenseMilestonePage({
  data,
  defenseType,
}: DefenseMilestonePageProps) {
  const [historyOpen, setHistoryOpen] = useState(false)

  // Split submissions into initial + resubmissions (oldest first).
  const initialSub = data?.submissions.find((s) => s.isInitial) ?? null
  const resubmissions = (data?.submissions ?? [])
    .filter((s) => !s.isInitial)
    .sort((a, b) => a.version - b.version)

  const initialItem: DocumentHistoryItem | null = initialSub
    ? {
        info: {
          fileName: initialSub.fileName,
          size: initialSub.size,
          submittedAt: initialSub.dateSubmitted,
          blobUrl: initialSub.blobUrl,
          submittedByName: initialSub.submittedByName,
        },
        status: initialSub.status as InitialDocumentStatus,
      }
    : null

  const resubmissionItems: DocumentHistoryItem[] = resubmissions.map((s) => ({
    info: {
      fileName: s.fileName,
      size: s.size,
      submittedAt: s.dateSubmitted,
      blobUrl: s.blobUrl,
      submittedByName: s.submittedByName,
      version: s.version,
    },
    status: s.status as ResubmissionStatus,
  }))

  return (
    <>
      <GroupContext onDocumentHistory={() => setHistoryOpen(true)} />

      <div className="flex-1 min-h-0 px-8 py-[30px] overflow-y-auto">
        <div className="flex flex-col gap-5">
          {data ? (
            <DefenseMilestoneView data={data} />
          ) : (
            <DefenseEmptyState type={defenseType} />
          )}
        </div>
      </div>

      <DocumentHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        initial={initialItem}
        resubmissions={resubmissionItems}
      />
    </>
  )
}
