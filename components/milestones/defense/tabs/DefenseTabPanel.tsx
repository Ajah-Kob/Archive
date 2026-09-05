'use client'

import { useEffect, useRef } from 'react'
import type { DefenseType } from '@prisma/client'
import type { StudentDefenseSessionPayload } from '@/lib/actions/student-defense'
import { useDefenseTabsRefresh } from '../DefenseTabsRefreshContext'
import {
  resubmitDefenseDocument,
  replaceDefenseDocument,
  submitDefenseDocument,
  uploadDefenseToken,
} from '@/lib/actions/student-defense'
import { VerdictCallout, type VerdictCalloutState } from '../VerdictCallout'
import {
  DefenseDocumentCard,
  type DefenseDocumentInfo,
  type DefenseUploadActions,
  type InitialDocumentStatus,
  type ResubmissionStatus,
} from '../DefenseDocumentCard'
import { DefenseTabSkeleton } from './DefenseTabSkeleton'
import { MilestoneDefenseDetailsCard } from '../MilestoneDefenseDetailsCard'
import { DefenseEmptyState } from '../DefenseEmptyState'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'

// ── Pure helpers (<50 lines each) ────────────────────────────────────────────

function deriveVerdictState(
  data: StudentDefenseSessionPayload,
): VerdictCalloutState {
  if (data.submissions.length === 0) return 'NO_DOCUMENT'
  if (data.verdict === 'PENDING') return 'WAITING_FOR_SCHEDULE'
  return data.verdict as VerdictCalloutState
}

function getInitialDoc(
  data: StudentDefenseSessionPayload,
): { info: DefenseDocumentInfo; status: InitialDocumentStatus } | null {
  const sub = data.submissions.find(
    (s) => s.isInitial,
  ) as unknown as
    | (StudentDefenseSessionPayload['submissions'][number] & {
        annotationStats?: { comments: number; pages: number } | null
      })
    | undefined
  if (!sub) return null
  const reviewedAt =
    (data as unknown as { verdictSubmittedAt?: string | null })
      .verdictSubmittedAt ?? null
  const stats = (sub as unknown as { annotationStats?: { comments: number; pages: number } | null })
    .annotationStats
  return {
    info: {
      id: sub.id,
      fileName: sub.fileName,
      size: sub.size,
      submittedAt: sub.dateSubmitted,
      blobUrl: sub.blobUrl,
      submittedByName: sub.submittedByName,
      version: sub.version,
      comments: stats?.comments ?? null,
      pages: stats?.pages ?? null,
      reviewedAt,
    } as unknown as DefenseDocumentInfo,
    status: sub.status as InitialDocumentStatus,
  }
}

function toSchedulePayload(
  data: StudentDefenseSessionPayload,
): DefenseSchedulePayload {
  return {
    id: data.id,
    groupId: data.groupId,
    groupName: data.groupName,
    sectionName: data.sectionName,
    adviserName: data.adviserName,
    type: data.type,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    venue: data.venue,
    verdict: data.verdict,
    createdById: 0,
    createdByName: '',
    panelists: data.panelists,
    members: data.members ?? [],
  }
}

function resolveMilestoneSlug(
  defenseType: DefenseType | 'PROPOSAL' | 'FINAL',
): string {
  return defenseType === 'FINAL' ? 'final-defense' : 'proposal-defense'
}



// ── Props ────────────────────────────────────────────────────────────────────

export interface DefenseTabPanelProps {
  data: StudentDefenseSessionPayload | null
  defenseType: DefenseType | 'PROPOSAL' | 'FINAL'
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * DefenseTabPanel — defense tab for student milestone.
 * Composes VerdictCallout (via deriveVerdictState) + filtered DefenseDocumentCard (isInitial only)
 * + MilestoneDefenseDetailsCard. GroupContext + DocumentHistoryDrawer remain accessible.
 * Reused for both proposal-defense and final-defense via defenseType prop.
 */
export function DefenseTabPanel({ data, defenseType }: DefenseTabPanelProps) {
  const { isRefreshing, triggerRefresh } = useDefenseTabsRefresh()

  if (!data) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-[30px] flex flex-col">
        <DefenseEmptyState type={defenseType as DefenseType} />
      </div>
    )
  }

  const verdictState = deriveVerdictState(data)
  const initialDoc = getInitialDoc(data)
  const milestoneSlug = resolveMilestoneSlug(defenseType)
  const reviewedAt =
    (data as unknown as { verdictSubmittedAt?: string | null })
      .verdictSubmittedAt ?? null
  const initialStats = (initialDoc?.info as unknown as {
    comments?: number | null
    pages?: number | null
  } | null) ?? null
  const comments = initialStats?.comments ?? null
  const pages = initialStats?.pages ?? null
  const workspaceHref =
    initialDoc?.info.id != null
      ? `/student/milestone/${milestoneSlug}/${initialDoc.info.id}`
      : undefined

  const canResubmit =
    (data.verdict === 'MINOR_REVISION' ||
      data.verdict === 'MAJOR_REVISION') &&
    data.submissions.filter((s) => !s.isInitial).length === 0

  const actions: DefenseUploadActions = {
    requestUploadToken: uploadDefenseToken,
    submitDocument: (d) =>
      submitDefenseDocument({ ...d, mimeType: 'application/pdf' }),
    resubmitDocument: (d) =>
      resubmitDefenseDocument({ ...d, mimeType: 'application/pdf' }),
    replaceDocument: (d) =>
      replaceDefenseDocument({ ...d, mimeType: 'application/pdf' }),
  }

  const handleSubmitted = () => {
    triggerRefresh()
  }

  // Whole tabs refreshing (upload/submit/replace) — use dedicated skeleton (no HeaderBar, bar stays via layout)
  if (isRefreshing) {
    return <DefenseTabSkeleton />
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-[30px] flex flex-col">
      <div className="flex flex-col gap-5">
        <VerdictCallout
          state={verdictState}
          reviewedAt={reviewedAt}
          comments={comments}
          pages={pages}
          workspaceHref={workspaceHref}
        />
        <DefenseDocumentCard
            initial={initialDoc?.info ?? null}
            initialStatus={initialDoc?.status ?? null}
            resubmission={null}
            resubmissionStatus={null}
            canResubmit={canResubmit}
            onSubmitted={handleSubmitted}
            actions={actions}
            milestoneSlug={milestoneSlug}
            forceView
          />
        <MilestoneDefenseDetailsCard schedule={toSchedulePayload(data)} />
      </div>
    </div>
  )
}

export default DefenseTabPanel
