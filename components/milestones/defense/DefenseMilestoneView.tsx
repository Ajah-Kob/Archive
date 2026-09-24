'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StudentDefenseSessionPayload } from '@/lib/actions/student-defense'
import {
  submitDefenseDocument,
  resubmitDefenseDocument,
  replaceDefenseDocument,
  uploadDefenseToken,
} from '@/lib/actions/student-defense'
import { VerdictCallout, type VerdictCalloutState } from './VerdictCallout'
import {
  DefenseDocumentCard,
  type DefenseDocumentInfo,
  type DefenseUploadActions,
  type InitialDocumentStatus,
  type ResubmissionStatus,
} from './DefenseDocumentCard'
import { DefenseDocumentSkeleton } from './DefenseDocumentSkeleton'
import { MilestoneDefenseDetailsCard } from './MilestoneDefenseDetailsCard'
import type { DefenseSchedulePayload } from '@/lib/actions/defense'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps the session payload to a VerdictCallout state.
 * - No submissions → NO_DOCUMENT
 * - Verdict PENDING → WAITING_FOR_SCHEDULE
 * - Otherwise → the verdict maps 1:1 (APPROVED, MINOR_REVISION, MAJOR_REVISION, REDEFENSE)
 */
function deriveVerdictState(
  data: StudentDefenseSessionPayload,
): VerdictCalloutState {
  if (data.submissions.length === 0) return 'NO_DOCUMENT'
  if (data.verdict === 'PENDING') return 'WAITING_FOR_SCHEDULE'
  return data.verdict
}

/** Extracts the initial submission (isInitial) as a DefenseDocumentInfo or null. */
function getInitialDoc(
  data: StudentDefenseSessionPayload,
): { info: DefenseDocumentInfo; status: InitialDocumentStatus } | null {
  const sub = data.submissions.find((s) => s.isInitial) as unknown as
    | (typeof data.submissions[number] & { annotationStats?: { comments: number; pages: number } | null })
    | undefined
  if (!sub) return null
  const reviewedAt = (data as unknown as { verdictSubmittedAt?: string | null }).verdictSubmittedAt ?? null
  return {
    info: {
      id: sub.id,
      fileName: sub.fileName,
      size: sub.size,
      submittedAt: sub.dateSubmitted,
      blobUrl: sub.blobUrl,
      submittedByName: sub.submittedByName,
      version: sub.version,
      comments: (sub as unknown as { annotationStats?: { comments: number; pages: number } | null }).annotationStats?.comments ?? null,
      pages: (sub as unknown as { annotationStats?: { comments: number; pages: number } | null }).annotationStats?.pages ?? null,
      reviewedAt,
    } as unknown as DefenseDocumentInfo,
    status: sub.status as InitialDocumentStatus,
  }
}

/** Extracts the latest resubmission (isInitial === false) or null. */
function getResubmissionDoc(
  data: StudentDefenseSessionPayload,
): { info: DefenseDocumentInfo; status: ResubmissionStatus } | null {
  const sub = (data.submissions
    .filter((s) => !s.isInitial)
    .sort((a, b) => b.version - a.version)[0] as unknown as
    | (typeof data.submissions[number] & { annotationStats?: { comments: number; pages: number } | null })
    | undefined)
  if (!sub) return null
  return {
    info: {
      id: sub.id,
      fileName: sub.fileName,
      size: sub.size,
      submittedAt: sub.dateSubmitted,
      blobUrl: sub.blobUrl,
      submittedByName: sub.submittedByName,
      version: sub.version,
      comments: (sub as unknown as { annotationStats?: { comments: number; pages: number } | null }).annotationStats?.comments ?? null,
      pages: (sub as unknown as { annotationStats?: { comments: number; pages: number } | null }).annotationStats?.pages ?? null,
      reviewedAt: (sub as unknown as { reviewedAt?: string | null }).reviewedAt ?? null,
    } as unknown as DefenseDocumentInfo,
    status: sub.status as ResubmissionStatus,
  }
}

/**
 * Maps StudentDefenseSessionPayload → DefenseSchedulePayload for the
 * MilestoneDefenseDetailsCard. The card only uses date/startTime/endTime/venue/panelists
 * so the added createdById/createdByName are unused placeholders.
 */
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

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Client wrapper for the student defense milestone page.
 *
 * Receives the full session payload from the server page and maps it to the
 * individual defense components. Handles `router.refresh()` for the
 * `onSubmitted` callback that `DefenseDocumentCard` requires.
 */
export function DefenseMilestoneView({
  data,
}: {
  data: StudentDefenseSessionPayload
}) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const prevDataRef = useRef(data)

  // After a submit/replace we re-fetch the server data. While the refresh is in
  // flight the card would otherwise flash back to the idle upload state, so we
  // hold `refreshing` (rendering a skeleton) until the refreshed payload lands.
  // We detect completion by watching for the `data` prop to change rather than
  // awaiting router.refresh(), whose promise can resolve before the new props
  // are committed. A timeout guards against the refresh never landing.
  useEffect(() => {
    if (refreshing && prevDataRef.current !== data) {
      setRefreshing(false)
    }
    prevDataRef.current = data
  }, [data, refreshing])

  useEffect(() => {
    if (!refreshing) return
    const t = setTimeout(() => setRefreshing(false), 5000)
    return () => clearTimeout(t)
  }, [refreshing])

  const handleSubmitted = () => {
    setRefreshing(true)
    router.refresh()
  }

  const verdictState = deriveVerdictState(data)
  const initialDoc = getInitialDoc(data)
  const resubmitDoc = getResubmissionDoc(data)

  // Resubmission is allowed only after a revision verdict and before a resubmission exists.
  const canResubmit =
    (data.verdict === 'MINOR_REVISION' || data.verdict === 'MAJOR_REVISION') &&
    resubmitDoc === null

  const milestoneSlug = data.type === 'FINAL' ? 'final-defense' : 'proposal-defense'

  const actions: DefenseUploadActions = {
    requestUploadToken: uploadDefenseToken,
    submitDocument: (d) =>
      submitDefenseDocument({ ...d, mimeType: 'application/pdf' }),
    resubmitDocument: (d) =>
      resubmitDefenseDocument({ ...d, mimeType: 'application/pdf' }),
    replaceDocument: (d) =>
      replaceDefenseDocument({ ...d, mimeType: 'application/pdf' }),
  }

  const reviewedAt = (data as unknown as { verdictSubmittedAt?: string | null }).verdictSubmittedAt ?? null
  const annotationStats = (data as unknown as { annotationStats?: { comments: number; pages: number } | null }).annotationStats ?? null
  // Review feedback → latest document workspace (resubmission if exists, else initial)
  const reviewDocumentId = resubmitDoc?.info.id ?? initialDoc?.info.id ?? null
  const reviewWorkspaceHref =
    reviewDocumentId != null ? `/student/milestone/${milestoneSlug}/${reviewDocumentId}` : undefined

  return (
    <>
      <VerdictCallout state={verdictState} reviewedAt={reviewedAt} comments={annotationStats?.comments ?? null} pages={annotationStats?.pages ?? null} workspaceHref={reviewWorkspaceHref} />
      {refreshing ? (
        <DefenseDocumentSkeleton />
      ) : (
        <DefenseDocumentCard
          initial={initialDoc?.info ?? null}
          initialStatus={initialDoc?.status ?? null}
          resubmission={resubmitDoc?.info ?? null}
          resubmissionStatus={resubmitDoc?.status ?? null}
          canResubmit={canResubmit}
          onSubmitted={handleSubmitted}
          actions={actions}
          milestoneSlug={milestoneSlug}
        />
      )}
      <MilestoneDefenseDetailsCard schedule={toSchedulePayload(data)} />
    </>
  )
}
