import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import {
  getDefenseSubmissionDetail,
} from '@/lib/actions/defense-annotations'
import { getDefenseAnnotations } from '@/lib/actions/defense-annotations'
import { DefenseDocumentWorkspace } from '@/components/defense/workspace/DefenseDocumentWorkspace'
import { DefenseFinalizedWorkspaceView } from '@/components/defense/workspace/DefenseFinalizedWorkspaceView'
import type { SubmissionMeta } from '@/types/milestones'
import type { SubmissionViewStatus } from '@/types/milestones'

function toViewStatus(status: string): SubmissionViewStatus {
  if (status === 'APPROVED') return 'APPROVED'
  if (status === 'REJECTED') return 'NEEDS_REVISION'
  return 'IN_REVIEW'
}

function toVerdictViewStatus(verdict: string): SubmissionViewStatus {
  if (verdict === 'APPROVED') return 'APPROVED'
  if (verdict === 'REJECTED' || verdict === 'MINOR_REVISION' || verdict === 'MAJOR_REVISION') return 'NEEDS_REVISION'
  return 'IN_REVIEW'
}

export default async function DefensePanelistWorkspacePage({
  params,
}: {
  params: Promise<{ scheduleId: string; submissionId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { scheduleId: scheduleIdRaw, submissionId: submissionIdRaw } = await params
  const scheduleId = parseInt(scheduleIdRaw, 10)
  const submissionId = parseInt(submissionIdRaw, 10)
  if (Number.isNaN(scheduleId) || Number.isNaN(submissionId)) notFound()

  const [detailRes, annotationsRes] = await Promise.all([
    getDefenseSubmissionDetail(submissionId),
    getDefenseAnnotations(submissionId),
  ])

  const detail =
    detailRes.success && detailRes.payload ? detailRes.payload : null
  if (!detail) notFound()

  // Guard: submission must belong to the schedule in the URL
  if (detail.scheduleId !== scheduleId) notFound()

  const annotations =
    annotationsRes.success && annotationsRes.payload
      ? annotationsRes.payload
      : null

  const initialAnnotations = Array.isArray((annotations as { data?: unknown })?.data)
    ? (annotations as { data: unknown[] }).data
    : Array.isArray(annotations?.data)
      ? annotations.data
      : []

  const chapterLabel =
    detail.type === 'FINAL'
      ? 'Final Defense'
      : detail.type === 'PROPOSAL'
        ? 'Proposal Defense'
        : `Defense ${detail.type}`
  const phase: 'CAPSTONE 1' | 'CAPSTONE 2' =
    detail.type === 'FINAL' ? 'CAPSTONE 2' : 'CAPSTONE 1'

  const isVerdictSubmitted = (detail as unknown as { verdict?: string }).verdict !== 'PENDING'
  // For the initial defense document the view status follows the schedule verdict once submitted.
  // For resubmitted documents (isInitial === false) the status is per-panelist review on that version — always For Review while pending.
  const viewStatus = detail.isInitial
    ? isVerdictSubmitted
      ? toVerdictViewStatus((detail as unknown as { verdict: string }).verdict)
      : toViewStatus(detail.status)
    : toViewStatus(detail.status)
  const draftStatus =
    (annotations?.status as 'DRAFT' | 'COMMITTED' | null) ?? null

  const meta: SubmissionMeta & { scheduleId?: number; isInitial?: boolean } = {
    id: detail.id,
    groupName: detail.groupName,
    chapter: chapterLabel,
    phase,
    submittedBy: detail.submittedBy,
    dateSubmitted: detail.dateSubmitted,
    fileName: detail.fileName,
    blobUrl: detail.blobUrl,
    mimeType: detail.mimeType,
    size: detail.size,
    status: viewStatus,
    reviewedBy: null,
    reviewedAt: (detail as unknown as { verdictSubmittedAt?: string | null }).verdictSubmittedAt ?? detail.reviewedAt,
    reviewNote: null,
    scheduleId: detail.scheduleId,
    isInitial: detail.isInitial,
  }

  const isCommitted = draftStatus === 'COMMITTED'
  // Resubmitted documents remain editable while IN_REVIEW even though the schedule verdict is already submitted (MINOR/MAJOR).
  const shouldFinalize =
    !detail.isCurrent ||
    viewStatus !== 'IN_REVIEW' ||
    isCommitted ||
    (detail.isInitial && isVerdictSubmitted)

  if (shouldFinalize) {
    return (
      <DefenseFinalizedWorkspaceView
        submission={meta}
        initialAnnotations={initialAnnotations as unknown[]}
        isSuperseded={!detail.isCurrent}
        backHref={`/faculty/defense/${detail.scheduleId}`}
        scheduleId={detail.scheduleId}
        draftStatus={draftStatus}
      />
    )
  }

  return (
    <DefenseDocumentWorkspace
      blobUrl={detail.blobUrl}
      submission={meta}
      initialAnnotations={initialAnnotations as unknown[]}
      draftStatus={draftStatus}
      backHref={`/faculty/defense/${detail.scheduleId}`}
      scheduleId={detail.scheduleId}
    />
  )
}
