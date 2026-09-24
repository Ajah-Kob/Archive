import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import {
  getStudentDefenseDetail,
  getStudentDefenseAnnotations,
  getStudentDefenseVersionList,
} from '@/lib/actions/student-defense'
import { DefenseDocumentWorkspace } from '@/components/defense/workspace/DefenseDocumentWorkspace'
import type { SubmissionMeta } from '@/types/milestones'
import type { SubmissionViewStatus } from '@/types/milestones'
import type { StudentVersionListItem } from '@/lib/actions/student-review'

const DEFENSE_SLUGS = ['proposal-defense', 'final-defense'] as const

function toViewStatus(status: string): SubmissionViewStatus {
  const normalized = status?.toUpperCase?.() ?? status
  if (normalized === 'APPROVED' || normalized === 'APPROVED') return 'APPROVED'
  if (
    normalized === 'REJECTED' ||
    normalized === 'REDEFENSE' ||
    normalized === 'NEEDS_REVISION' ||
    normalized === 'NEED_REVISION' ||
    normalized === 'MINOR_REVISION' ||
    normalized === 'MAJOR_REVISION'
  )
    return 'NEEDS_REVISION'
  if (
    normalized === 'PENDING' ||
    normalized === 'IN_REVIEW' ||
    normalized === 'IN REVIEW' ||
    normalized === 'FOR_REVIEW'
  )
    return 'IN_REVIEW'
  if (status === 'Approved') return 'APPROVED'
  if (status === 'Rejected' || status === 'Redefense') return 'NEEDS_REVISION'
  if (status === 'In Review') return 'IN_REVIEW'
  return 'IN_REVIEW'
}

function mapDefenseVersionStatus(status: string): SubmissionViewStatus {
  return toViewStatus(status)
}

export default async function StudentDefenseWorkspacePage({
  params,
}: {
  params: Promise<{ milestone: string; documentId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { milestone, documentId } = await params
  if (!DEFENSE_SLUGS.includes(milestone as (typeof DEFENSE_SLUGS)[number])) notFound()

  const id = parseInt(documentId, 10)
  if (Number.isNaN(id)) notFound()

  // Live schedule first; fall back to read-only history (soft-deleted
  // Redefense schedule with a submitted verdict).
  let detailRes = await getStudentDefenseDetail(id)
  let isHistory = false
  if (!detailRes.success || !detailRes.payload) {
    detailRes = await getStudentDefenseDetail(id, true)
    isHistory = detailRes.success && !!detailRes.payload
  }
  const [annotationsRes, versionsRes] = await Promise.all([
    getStudentDefenseAnnotations(id, isHistory),
    getStudentDefenseVersionList(id, isHistory),
  ])

  const detail =
    detailRes.success && detailRes.payload ? detailRes.payload : null
  if (!detail) notFound()

  const annotations =
    annotationsRes.success && annotationsRes.payload
      ? annotationsRes.payload
      : null

  const initialAnnotations = Array.isArray((annotations as { data?: unknown })?.data)
    ? (annotations as { data: unknown[] }).data
    : Array.isArray(annotations?.data)
      ? annotations.data
      : []

  const rawVersions =
    versionsRes.success && versionsRes.payload ? versionsRes.payload : []

  const versions: StudentVersionListItem[] = (rawVersions as Array<{
    id: number
    version: number
    status: string
    submittedAt: string
    isCurrent: boolean
  }>).map((v) => ({
    id: v.id,
    version: v.version,
    status: mapDefenseVersionStatus(v.status),
    submittedAt: v.submittedAt,
    isCurrent: v.isCurrent,
  }))

  const chapterLabel =
    detail.type === 'FINAL'
      ? 'Final Defense'
      : detail.type === 'PROPOSAL'
        ? 'Proposal Defense'
        : `Defense ${detail.type}`
  const phase: 'CAPSTONE 1' | 'CAPSTONE 2' =
    detail.type === 'FINAL' ? 'CAPSTONE 2' : 'CAPSTONE 1'

  const viewStatus = toViewStatus(detail.status)

  const meta: SubmissionMeta & { scheduleId?: number } = {
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
    reviewedAt: detail.reviewedAt,
    reviewNote: null,
    scheduleId: detail.scheduleId,
  }

  return (
    <DefenseDocumentWorkspace
      mode="student"
      blobUrl={detail.blobUrl}
      submission={meta}
      initialAnnotations={initialAnnotations as unknown[]}
      draftStatus={null}
      versions={versions}
      backHref={`/student/milestone/${milestone}`}
      scheduleId={detail.scheduleId}
      readOnly={isHistory}
    />
  )
}
