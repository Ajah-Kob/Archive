import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import {
  getStudentVersionDetail,
  getStudentSubmissionAnnotations,
  getStudentVersionList,
} from '@/lib/actions/student-review'
import { DocumentWorkspace } from '@/components/evaluation/workspace/DocumentWorkspace'
import type { SubmissionMeta } from '@/types/milestones'
import type { SubmissionViewStatus } from '@/types/milestones'

function toViewStatus(
  status: 'PENDING' | 'NEED_REVISION' | 'APPROVED',
): SubmissionViewStatus {
  if (status === 'NEED_REVISION') return 'NEEDS_REVISION'
  if (status === 'APPROVED') return 'APPROVED'
  return 'IN_REVIEW'
}

// Student read-only document workspace — ONE specific version per URL, same
// per-version architecture as the adviser workspace. The student mode strips
// every editing affordance; the read actions are group-scoped server-side.
export default async function StudentReviewWorkspacePage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { submissionId } = await params
  const id = parseInt(submissionId, 10)
  if (Number.isNaN(id)) notFound()

  const [detailRes, annotationsRes, versionsRes] = await Promise.all([
    getStudentVersionDetail(id),
    getStudentSubmissionAnnotations(id),
    getStudentVersionList(id),
  ])

  const version =
    detailRes.success && detailRes.payload ? detailRes.payload : null
  if (!version) notFound()

  const annotations =
    annotationsRes.success && annotationsRes.payload ? annotationsRes.payload : null
  const initialAnnotations = Array.isArray(annotations?.data)
    ? annotations.data
    : []

  const versions =
    versionsRes.success && versionsRes.payload ? versionsRes.payload : []

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

  return (
    <DocumentWorkspace
      mode="student"
      blobUrl={version.blobUrl}
      submission={meta}
      initialAnnotations={initialAnnotations}
      draftStatus={null}
      versions={versions}
      backHref={`/student/milestone/${version.chapterKey.toLowerCase().replace('_', '-')}`}
    />
  )
}
