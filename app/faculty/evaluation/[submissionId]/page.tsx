import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import {
  getSubmission,
  getEvaluationVersions,
} from '@/lib/actions/evaluation'
import { getSubmissionAnnotations } from '@/lib/actions/annotations'
import { DocumentWorkspace } from '@/components/evaluation/workspace/DocumentWorkspace'
import type { SubmissionMeta } from '@/types/milestones'
import type { SubmissionViewStatus } from '@/types/milestones'

// Map the DB review status to the shared view status. The workspace only
// opens live (deletedAt: null) submissions, so SUPERSEDED never applies here.
function toViewStatus(
  status: 'PENDING' | 'NEED_REVISION' | 'APPROVED',
): SubmissionViewStatus {
  if (status === 'NEED_REVISION') return 'NEEDS_REVISION'
  if (status === 'APPROVED') return 'APPROVED'
  return 'IN_REVIEW'
}

export default async function SubmissionWorkspacePage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { submissionId } = await params
  const id = parseInt(submissionId, 10)
  if (Number.isNaN(id)) notFound()

  // All three fetches are server actions that re-verify the submission
  // belongs to the adviser's assigned groups (deletedAt: null on every hop).
  const [submissionRes, versionsRes, annotationsRes] = await Promise.all([
    getSubmission(id),
    getEvaluationVersions(id),
    getSubmissionAnnotations(id),
  ])

  const submission =
    submissionRes.success && submissionRes.payload ? submissionRes.payload : null
  if (!submission) notFound()

  const versions =
    versionsRes.success && versionsRes.payload ? versionsRes.payload.versions : []
  const annotations =
    annotationsRes.success && annotationsRes.payload ? annotationsRes.payload : null

  // Saved annotation rows are stored as a JSON array; the client workspace
  // deserializes them (base64 → ArrayBuffer) before importAnnotations().
  const initialAnnotations = Array.isArray(annotations?.data)
    ? annotations.data
    : []

  const meta: SubmissionMeta = {
    id: submission.id,
    groupName: submission.groupName,
    chapter: submission.chapter,
    phase: submission.phase,
    submittedBy: submission.submittedBy,
    dateSubmitted: submission.dateSubmitted,
    fileName: submission.fileName,
    blobUrl: submission.blobUrl,
    mimeType: submission.mimeType,
    size: submission.size,
    status: toViewStatus(submission.status),
    reviewedBy: submission.reviewedBy,
    reviewedAt: submission.reviewedAt,
    reviewNote: submission.reviewNote,
  }

  return (
    <DocumentWorkspace
      blobUrl={submission.blobUrl}
      submission={meta}
      versions={versions}
      initialAnnotations={initialAnnotations}
      draftStatus={annotations?.status ?? null}
    />
  )
}