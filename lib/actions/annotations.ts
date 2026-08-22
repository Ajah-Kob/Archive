'use server'

import { cacheTag, cacheLife, revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAdviser, unauthorized } from '@/lib/actions/guard'

const tag = (submissionId: number, authorId?: number) =>
  authorId
    ? `submission-${submissionId}-annotations-${authorId}`
    : `submission-${submissionId}-annotations`

// Returns the live adviser record (id + reviewer User.id) for the current
// user, or null. The reviewer User.id (adviser.faculty.userId) is stored on
// SubmissionAnnotation.authorId, matching MilestoneSubmission.reviewedById.
async function requireAdviserRow() {
  const session = await requireAdviser()
  if (!session) return null
  return prisma.adviser.findFirst({
    where: {
      faculty: { userId: +session.user.id, deletedAt: null },
      deletedAt: null,
    },
    select: { id: true, faculty: { select: { userId: true } } },
  })
}

// Verifies the submission belongs to one of the adviser's assigned groups.
// Every hop in the relation chain must be live (deletedAt: null).
async function findAdviserSubmission(submissionId: number, adviserId: number) {
  return prisma.milestoneSubmission.findFirst({
    where: {
      id: submissionId,
      deletedAt: null,
      milestone: {
        deletedAt: null,
        group: { deletedAt: null, adviserId },
      },
    },
    select: { id: true },
  })
}

// Loads the adviser's own annotation row (draft or committed) for the
// workspace. The session check happens OUTSIDE the cached scope — Next 16
// forbids dynamic data (headers/cookies) inside 'use cache' — so the adviser
// ids are resolved here and passed into the cached data function, which
// scopes the cache tag per (submission, author).
export async function getSubmissionAnnotations(submissionId: number) {
  const adviser = await requireAdviserRow()
  if (!adviser) return { ...unauthorized, payload: null }
  return getSubmissionAnnotationsData(
    submissionId,
    adviser.id,
    adviser.faculty.userId,
  )
}

// Persistent, tag-based cache — revalidated by the mutations below.
async function getSubmissionAnnotationsData(
  submissionId: number,
  adviserId: number,
  authorId: number,
) {
  'use cache'
  cacheTag(tag(submissionId, authorId))
  cacheLife('max')

  try {
    const submission = await findAdviserSubmission(submissionId, adviserId)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your assigned groups.',
        payload: null,
      }
    }

    const row = await prisma.submissionAnnotation.findFirst({
      where: {
        submissionId,
        authorId,
        deletedAt: null,
      },
      select: { data: true, status: true },
    })
    if (!row) return { success: true, message: '', payload: null }

    // Dedupe the persisted annotations by id. A previous session could have
    // saved duplicates (the annotation reducer is not idempotent), and the
    // client's AnnotationLayer renders one child per uid — duplicates cause
    // React key collisions. The next auto-save overwrites the row with clean
    // data, so this is a read-time guard.
    const data = dedupeAnnotationData(row.data)

    return {
      success: true,
      message: '',
      payload: { data, status: row.status },
    }
  } catch (error) {
    console.error('[getSubmissionAnnotations | Error]:', error)
    return {
      success: false,
      message: 'Failed to load annotations.',
      payload: null,
    }
  }
}

// Keeps the first occurrence of each annotation id in a persisted
// AnnotationTransferItem[] (stored as Prisma Json). Items without an id pass
// through unchanged.
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

// Upserts the adviser's annotation row as DRAFT (debounced auto-save path).
export async function saveAnnotationDraft(submissionId: number, data: unknown) {
  const adviser = await requireAdviserRow()
  if (!adviser) return { ...unauthorized, payload: null }

  try {
    const submission = await findAdviserSubmission(submissionId, adviser.id)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your assigned groups.',
        payload: null,
      }
    }

    await prisma.submissionAnnotation.upsert({
      where: {
        submissionId_authorId: {
          submissionId,
          authorId: adviser.faculty.userId,
        },
      },
      create: {
        submissionId,
        authorId: adviser.faculty.userId,
        data: data as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
      update: {
        data: data as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
    })

    revalidateTag(tag(submissionId, adviser.faculty.userId), { expire: 0 })
    return { success: true, message: 'Draft saved.' }
  } catch (error) {
    console.error('[saveAnnotationDraft | Error]:', error)
    return { success: false, message: 'Failed to save the draft.' }
  }
}

// Flips the adviser's annotation row to COMMITTED (called by the review flow
// after the verdict; a failed commit leaves the draft for a later retry).
export async function commitAnnotations(submissionId: number, data: unknown) {
  const adviser = await requireAdviserRow()
  if (!adviser) return { ...unauthorized, payload: null }

  try {
    const submission = await findAdviserSubmission(submissionId, adviser.id)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your assigned groups.',
        payload: null,
      }
    }

    await prisma.submissionAnnotation.upsert({
      where: {
        submissionId_authorId: {
          submissionId,
          authorId: adviser.faculty.userId,
        },
      },
      create: {
        submissionId,
        authorId: adviser.faculty.userId,
        data: data as Prisma.InputJsonValue,
        status: 'COMMITTED',
      },
      update: {
        data: data as Prisma.InputJsonValue,
        status: 'COMMITTED',
      },
    })

    revalidateTag(tag(submissionId, adviser.faculty.userId), { expire: 0 })
    return { success: true, message: 'Annotations committed.' }
  } catch (error) {
    console.error('[commitAnnotations | Error]:', error)
    return { success: false, message: 'Failed to commit annotations.' }
  }
}