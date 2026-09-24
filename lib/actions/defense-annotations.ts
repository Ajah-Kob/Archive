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
// With allowHistory, matches ONLY soft-deleted schedules with a submitted
// verdict (past Redefense cycles) for read-only reference.
async function findDefenseSubmission(
  submissionId: number,
  panelistUserId: number,
  allowHistory = false,
) {
  return prisma.defenseSubmission.findFirst({
    where: {
      id: submissionId,
      deletedAt: null,
      schedule: allowHistory
        ? {
            deletedAt: { not: null },
            verdict: { not: 'PENDING' },
            panelists: { some: { userId: panelistUserId, deletedAt: null } },
            group: { deletedAt: null, section: { deletedAt: null } },
          }
        : {
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
  status: 'PENDING' | 'APPROVED' | 'REDEFENSE'
  isCurrent: boolean
  reviewedAt: string | null
  /** True when served from a soft-deleted (past Redefense) schedule. */
  isHistory?: boolean
}

function resolvePanelistStatus(
  reviews: { panelistId: number; status: string }[],
  authorId: number,
): 'PENDING' | 'APPROVED' | 'REDEFENSE' {
  const myReview = reviews.find((r) => r.panelistId === authorId)
  if (myReview?.status === 'APPROVED') return 'APPROVED'
  if (myReview?.status === 'REDEFENSE') return 'REDEFENSE'
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
// With allowHistory, also serves submissions on soft-deleted (past Redefense)
// schedules with submitted verdicts.
export async function getDefenseSubmissionDetail(submissionId: number, allowHistory = false) {
  const session = await requirePanelist()
  if (!session) return { ...unauthorized, payload: null }
  const authorId = +session.user.id
  try {
    const submission = await prisma.defenseSubmission.findFirst({
      where: {
        id: submissionId,
        schedule: allowHistory
          ? {
              deletedAt: { not: null },
              verdict: { not: 'PENDING' },
              panelists: { some: { userId: authorId, deletedAt: null } },
              group: { deletedAt: null, section: { deletedAt: null } },
            }
          : {
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
    const payload = {
      ...toDefenseDetailPayload(submission as any, authorId),
      isHistory: allowHistory,
    }
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getDefenseSubmissionDetail | Error]:', error)
    return { success: false, message: 'Failed to load submission.', payload: null }
  }
}

// ───────────────────────────── Annotations (mirrors annotations.ts) ────────────

export async function getDefenseAnnotations(submissionId: number, allowHistory = false) {
  const session = await requirePanelist()
  if (!session) return { ...unauthorized, payload: null }
  return getDefenseAnnotationsData(submissionId, +session.user.id, allowHistory)
}

async function getDefenseAnnotationsData(
  submissionId: number,
  authorId: number,
  allowHistory = false,
) {
  'use cache'
  cacheTag(tag(submissionId, authorId))
  // Shared tag: every author's write revalidates it (see save/commit
  // below), so cross-author readers below stay fresh.
  cacheTag(`defense-submission-${submissionId}-annotations`)
  cacheLife('max')
  try {
    const submission = await findDefenseSubmission(
      submissionId,
      authorId,
      allowHistory,
    )
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your assigned defenses.',
        payload: null,
      }
    }
    // Own row (any status — needed for draft editing) plus every other
    // author's COMMITTED rows (read-only cross-panelist review). Drafts of
    // other authors stay private. Visibility flags are honored for all rows
    // by the existing filter below.
    const rows = await (prisma as any).defenseSubmissionAnnotation.findMany({
      where: {
        submissionId,
        deletedAt: null,
        OR: [{ authorId }, { status: 'COMMITTED' }],
      },
      select: { data: true, status: true, authorId: true },
    })
    const own = rows.find((r: { authorId: number }) => r.authorId === authorId) ?? null
    const merged = rows.flatMap((r: { data: unknown }) =>
      Array.isArray(r.data) ? (r.data as unknown[]) : [],
    )
    if (!own && merged.length === 0) {
      return { success: true, message: '', payload: null }
    }
    const deduped = dedupeAnnotationData(merged)
    const data = filterVisibleAnnotations(deduped)
    return {
      success: true,
      message: '',
      payload: { data, status: own?.status ?? 'COMMITTED' },
    }
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
