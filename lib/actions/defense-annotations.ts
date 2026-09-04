'use server'

import { cacheTag, cacheLife, revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requirePanelist, unauthorized } from '@/lib/actions/guard'
import { revalidateFeature } from '@/lib/actions/revalidate'

const tag = (submissionId: number, authorId?: number) =>
  authorId
    ? `defense-submission-${submissionId}-annotations-${authorId}`
    : `defense-submission-${submissionId}-annotations`

// Verifies the submission belongs to a schedule where the caller is a panelist.
// Every hop filters deletedAt:null — mirrors findAdviserSubmission.
async function findDefenseSubmission(submissionId: number, panelistUserId: number) {
  return prisma.defenseSubmission.findFirst({
    where: {
      id: submissionId,
      deletedAt: null,
      schedule: {
        deletedAt: null,
        panelists: { some: { userId: panelistUserId, deletedAt: null } },
        group: { deletedAt: null, section: { deletedAt: null } },
      },
    },
    select: { id: true },
  })
}

// ───────────────────────────── Detail (mirrors getVersionDetail) ───────────────

export interface DefenseSubmissionDetail {
  id: number
  scheduleId: number
  groupId: number
  groupName: string
  sectionName: string
  type: string
  verdict: string
  verdictSubmittedAt: string | null
  version: number
  isInitial: boolean
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  dateSubmitted: string
  submittedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  isCurrent: boolean
  reviewedAt: string | null
}

function resolvePanelistStatus(
  reviews: { panelistId: number; status: string }[],
  authorId: number,
): 'PENDING' | 'APPROVED' | 'REJECTED' {
  const myReview = reviews.find((r) => r.panelistId === authorId)
  if (myReview?.status === 'APPROVED') return 'APPROVED'
  if (myReview?.status === 'REJECTED') return 'REJECTED'
  return 'PENDING'
}

function toDefenseDetailPayload(
  submission: {
    id: number
    scheduleId: number
    version: number
    isInitial: boolean
    fileName: string
    blobUrl: string
    mimeType: string
    size: number
    createdAt: Date
    deletedAt: Date | null
    schedule: {
      type: string
      verdict: string
      verdictSubmittedAt?: Date | null
      groupId: number
      group: { groupName: string; section: { section: string } }
    }
    user: { name: string }
    reviews: { panelistId: number; status: string; reviewedAt: Date | null }[]
  },
  authorId: number,
): DefenseSubmissionDetail {
  const status = resolvePanelistStatus(submission.reviews, authorId)
  const myReview = submission.reviews.find((r) => r.panelistId === authorId)
  return {
    id: submission.id,
    scheduleId: submission.scheduleId,
    groupId: submission.schedule.groupId,
    groupName: submission.schedule.group.groupName,
    sectionName: submission.schedule.group.section.section,
    type: submission.schedule.type,
    verdict: submission.schedule.verdict,
    verdictSubmittedAt: (submission.schedule as unknown as { verdictSubmittedAt?: Date | null }).verdictSubmittedAt?.toISOString() ?? null,
    version: submission.version,
    isInitial: submission.isInitial,
    fileName: submission.fileName,
    blobUrl: submission.blobUrl,
    mimeType: submission.mimeType,
    size: submission.size,
    dateSubmitted: submission.createdAt.toISOString(),
    submittedBy: submission.user.name,
    status,
    isCurrent: submission.deletedAt == null,
    reviewedAt: myReview?.reviewedAt ? myReview.reviewedAt.toISOString() : null,
  }
}

// Single submission of the panelist's assigned schedules — INCLUDING
// soft-deleted versions so a previous version can be opened read-only.
// Every hop except the submission row itself filters deletedAt:null;
// isCurrent derives from submission.deletedAt. Never throws.
export async function getDefenseSubmissionDetail(submissionId: number) {
  const session = await requirePanelist()
  if (!session) return { ...unauthorized, payload: null }
  const authorId = +session.user.id
  try {
    const submission = await prisma.defenseSubmission.findFirst({
      where: {
        id: submissionId,
        schedule: {
          deletedAt: null,
          panelists: { some: { userId: authorId, deletedAt: null } },
          group: { deletedAt: null, section: { deletedAt: null } },
        },
      },
      include: {
        schedule: {
          include: {
            group: { include: { section: { select: { section: true } } } },
          },
        },
        user: { select: { name: true } },
        reviews: {
          where: { deletedAt: null },
          select: { panelistId: true, status: true, reviewedAt: true },
        },
      },
    })
    if (!submission) {
      return { success: false, message: 'Submission not found.', payload: null }
    }
    const payload = toDefenseDetailPayload(submission as any, authorId)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getDefenseSubmissionDetail | Error]:', error)
    return { success: false, message: 'Failed to load submission.', payload: null }
  }
}

// ───────────────────────────── Annotations (mirrors annotations.ts) ────────────

export async function getDefenseAnnotations(submissionId: number) {
  const session = await requirePanelist()
  if (!session) return { ...unauthorized, payload: null }
  return getDefenseAnnotationsData(submissionId, +session.user.id)
}

async function getDefenseAnnotationsData(submissionId: number, authorId: number) {
  'use cache'
  cacheTag(tag(submissionId, authorId))
  cacheLife('max')
  try {
    const submission = await findDefenseSubmission(submissionId, authorId)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your assigned defenses.',
        payload: null,
      }
    }
    const row = await (prisma as any).defenseSubmissionAnnotation.findFirst({
      where: { submissionId, authorId, deletedAt: null },
      select: { data: true, status: true },
    })
    if (!row) return { success: true, message: '', payload: null }
    const deduped = dedupeAnnotationData(row.data)
    const data = filterVisibleAnnotations(deduped)
    return { success: true, message: '', payload: { data, status: row.status } }
  } catch (error) {
    console.error('[getDefenseAnnotations | Error]:', error)
    return { success: false, message: 'Failed to load annotations.', payload: null }
  }
}

function dedupeAnnotationData(data: Prisma.JsonValue): Prisma.JsonValue {
  if (!Array.isArray(data)) return data
  const seen = new Set<string>()
  const out: Prisma.JsonValue[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') {
      out.push(item)
      continue
    }
    const annotation = (item as { annotation?: { id?: unknown } }).annotation
    const id = typeof annotation?.id === 'string' ? annotation.id : null
    if (id) {
      if (seen.has(id)) continue
      seen.add(id)
    }
    out.push(item)
  }
  return out
}

function isAnnotationVisible(item: unknown): boolean {
  if (!item || typeof item !== 'object') return true
  const visible = (item as { isVisible?: unknown }).isVisible
  return visible !== false
}

function filterVisibleAnnotations(data: Prisma.JsonValue): Prisma.JsonValue {
  if (!Array.isArray(data)) return data
  return (data as unknown[]).filter(isAnnotationVisible) as unknown as Prisma.JsonValue
}

export async function saveDefenseAnnotationDraft(submissionId: number, data: unknown) {
  const session = await requirePanelist()
  if (!session) return { ...unauthorized, payload: null }
  const authorId = +session.user.id
  try {
    const submission = await findDefenseSubmission(submissionId, authorId)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your assigned defenses.',
        payload: null,
      }
    }
    await (prisma as any).defenseSubmissionAnnotation.upsert({
      where: { submissionId_authorId: { submissionId, authorId } },
      create: {
        submissionId,
        authorId,
        data: data as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
      update: { data: data as Prisma.InputJsonValue, status: 'DRAFT' },
    })
    const tagConfig = { expire: 0 } as const
    revalidateTag(tag(submissionId, authorId), tagConfig)
    revalidateTag(`defense-submission-${submissionId}-annotations`, tagConfig)
    revalidateTag('defense', tagConfig)
    revalidateFeature('defense')
    return { success: true, message: 'Draft saved.' }
  } catch (error) {
    console.error('[saveDefenseAnnotationDraft | Error]:', error)
    return { success: false, message: 'Failed to save the draft.' }
  }
}

export async function commitDefenseAnnotations(submissionId: number, data: unknown) {
  const session = await requirePanelist()
  if (!session) return { ...unauthorized, payload: null }
  const authorId = +session.user.id
  try {
    const submission = await findDefenseSubmission(submissionId, authorId)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your assigned defenses.',
        payload: null,
      }
    }
    await (prisma as any).defenseSubmissionAnnotation.upsert({
      where: { submissionId_authorId: { submissionId, authorId } },
      create: {
        submissionId,
        authorId,
        data: data as Prisma.InputJsonValue,
        status: 'COMMITTED',
      },
      update: { data: data as Prisma.InputJsonValue, status: 'COMMITTED' },
    })
    const tagConfig = { expire: 0 } as const
    revalidateTag(tag(submissionId, authorId), tagConfig)
    revalidateTag(`defense-submission-${submissionId}-annotations`, tagConfig)
    revalidateTag('defense', tagConfig)
    revalidateFeature('defense')
    return { success: true, message: 'Annotations committed.' }
  } catch (error) {
    console.error('[commitDefenseAnnotations | Error]:', error)
    return { success: false, message: 'Failed to commit annotations.' }
  }
}
