import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getVersionDetail } from '@/lib/actions/evaluation'
import { getSubmissionAnnotations } from '@/lib/actions/annotations'
import { DocumentWorkspace } from '@/components/evaluation/workspace/DocumentWorkspace'
import { FinalizedWorkspaceView } from '@/components/evaluation/workspace/FinalizedWorkspaceView'
import type { SubmissionMeta } from '@/types/milestones'
import type { SubmissionViewStatus } from '@/types/milestones'

// Map the DB review status to the shared view status. The workspace only
// opens submissions of live milestones, so SUPERSEDED never applies here.
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

  // Each browser tab opens ONE specific document version. The version's own
  // status/review metadata drives everything: a superseded version is always
  // read-only, and the current version depends on its verdict state.
  const [versionRes, annotationsRes] = await Promise.all([
    getVersionDetail(id),
    getSubmissionAnnotations(id),
  ])

  const version =
    versionRes.success && versionRes.payload ? versionRes.payload : null
  if (!version) notFound()

  const annotations =
    annotationsRes.success && annotationsRes.payload ? annotationsRes.payload : null

  // Saved annotation rows are stored as a JSON array; the client workspace
  // deserializes them (base64 → ArrayBuffer) before importAnnotations().
  const initialAnnotations = Array.isArray(annotations?.data)
    ? annotations.data
    : []

  const meta: SubmissionMeta = {
    id: version.id,
    groupName: version.groupName,
    chapter: version.chapter,
    phase: version.phase,
    submittedBy: version.submittedBy,
    dateSubmitted: version.dateSubmitted,
    fileName: version.fileName,
    blobUrl: version.blobUrl,
    mimeType: version.mimeType,
    size: version.size,
    status: toViewStatus(version.status),
    reviewedBy: version.reviewedBy,
    reviewedAt: version.reviewedAt,
    reviewNote: version.reviewNote,
  }

  // Any version with a verdict — current-finalized OR superseded — is locked:
  // read-only viewing of that version's committed annotations.
  if (!version.isCurrent || version.status !== 'PENDING') {
    return (
      <FinalizedWorkspaceView
        submission={meta}
        initialAnnotations={initialAnnotations}
        isSuperseded={!version.isCurrent}
      />
    )
  }

  return (
    <DocumentWorkspace
      blobUrl={version.blobUrl}
      submission={meta}
      initialAnnotations={initialAnnotations}
      draftStatus={annotations?.status ?? null}
    />
  )
}
