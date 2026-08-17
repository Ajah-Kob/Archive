'use server'

import { revalidateTag } from 'next/cache'
import prisma from '@/lib/prisma'
import { requireAdviser, unauthorized } from '@/lib/actions/guard'

export interface EvaluationItem {
  id: number
  groupId: number
  groupName: string
  chapter: string
  phase: 'CAPSTONE 1' | 'CAPSTONE 2'
  dateSubmitted: string
  submittedBy: string
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
}

export interface EvaluationVersion {
  id: number
  version: number
  fileName: string
  blobUrl: string
  submittedBy: string
  createdAt: string
  isCurrent: boolean
  status: 'PENDING' | 'NEED_REVISION' | 'APPROVED'
  reviewedAt: string | null
}

export interface EvaluationVersionsPayload {
  chapter: string
  versions: EvaluationVersion[]
}

const CHAPTER_LABELS: Record<string, string> = {
  CHAPTER_1: 'Chapter 1',
  CHAPTER_2: 'Chapter 2',
  CHAPTER_3: 'Chapter 3',
  CHAPTER_4: 'Chapter 4',
  CHAPTER_5: 'Chapter 5',
}

// Returns the live adviser record (id + reviewer User.id) for the current
// user, or null. The reviewer User.id (adviser.faculty.userId) is stored on
// reviewedById, matching Topic.reviewedById.
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

// Current submissions of the adviser's assigned groups, newest first. A
// "current" submission is the live (non-soft-deleted) row of a milestone —
// previous versions are the soft-deleted rows in the same milestone.
async function getEvaluationsData(adviserId: number): Promise<EvaluationItem[]> {
  const submissions = await prisma.milestoneSubmission.findMany({
    where: {
      deletedAt: null,
      milestone: {
        deletedAt: null,
        group: { deletedAt: null, adviserId },
      },
    },
    include: {
      milestone: {
        include: { group: { select: { groupName: true } } },
      },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return submissions.map(
    (s): EvaluationItem => ({
      id: s.id,
      groupId: s.milestone.groupId,
      groupName: s.milestone.group.groupName,
      chapter: CHAPTER_LABELS[s.milestone.chapter] ?? s.milestone.chapter,
      phase: s.milestone.phase === 'CAPSTONE_2' ? 'CAPSTONE 2' : 'CAPSTONE 1',
      dateSubmitted: s.createdAt.toISOString(),
      submittedBy: s.user.name,
      fileName: s.fileName,
      blobUrl: s.blobUrl,
      mimeType: s.mimeType,
      size: s.size,
    }),
  )
}

export async function getEvaluations() {
  const adviser = await requireAdviserRow()
  if (!adviser) return { ...unauthorized, payload: null }

  try {
    const payload = await getEvaluationsData(adviser.id)
    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getEvaluations | Error]:', error)
    return {
      success: false,
      message: 'Failed to load evaluations.',
      payload: null,
    }
  }
}

// All versions of a chapter submission (current + soft-deleted previous rows).
// Version numbers mirror the topic chain derivation: position + 1, ordered by
// createdAt.
export async function getEvaluationVersions(submissionId: number) {
  const adviser = await requireAdviserRow()
  if (!adviser) return { ...unauthorized, payload: null }

  try {
    const submission = await prisma.milestoneSubmission.findFirst({
      where: {
        id: submissionId,
        milestone: {
          deletedAt: null,
          group: { deletedAt: null, adviserId: adviser.id },
        },
      },
      select: {
        milestoneId: true,
        milestone: { select: { chapter: true } },
      },
    })
    if (!submission) {
      return { success: false, message: 'Submission not found.', payload: null }
    }

    const chain = await prisma.milestoneSubmission.findMany({
      where: { milestoneId: submission.milestoneId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true } } },
    })

    const versions: EvaluationVersion[] = chain.map((s, index) => ({
      id: s.id,
      version: index + 1,
      fileName: s.fileName,
      blobUrl: s.blobUrl,
      submittedBy: s.user.name,
      createdAt: s.createdAt.toISOString(),
      isCurrent: !s.deletedAt,
      status: s.status as 'PENDING' | 'NEED_REVISION' | 'APPROVED',
      reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
    }))

    const payload: EvaluationVersionsPayload = {
      chapter: CHAPTER_LABELS[submission.milestone.chapter] ?? submission.milestone.chapter,
      versions,
    }

    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getEvaluationVersions | Error]:', error)
    return {
      success: false,
      message: 'Failed to load submission.',
      payload: null,
    }
  }
}

// Adviser reviews the current submission of an assigned group's chapter.
// Only the live (non-soft-deleted) row is reviewable; the write is a
// conditional updateMany so a concurrent resubmit that soft-deleted the row
// cannot receive a review.
export async function reviewSubmission(
  submissionId: number,
  decision: 'APPROVED' | 'NEED_REVISION',
  note: string | null,
) {
  const adviser = await requireAdviserRow()
  if (!adviser) return { ...unauthorized }

  const trimmedNote = note?.trim() ?? ''
  if (decision === 'NEED_REVISION' && !trimmedNote) {
    return {
      success: false,
      message: 'Feedback is required when requesting revisions.',
    }
  }

  try {
    const submission = await prisma.milestoneSubmission.findFirst({
      where: {
        id: submissionId,
        deletedAt: null,
        milestone: {
          deletedAt: null,
          group: { deletedAt: null, adviserId: adviser.id },
        },
      },
      select: {
        id: true,
        milestone: {
          select: {
            group: {
              select: {
                id: true,
                sectionId: true,
                students: {
                  where: { deletedAt: null },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    })
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your assigned groups.',
      }
    }

    const result = await prisma.milestoneSubmission.updateMany({
      where: { id: submission.id, deletedAt: null },
      data: {
        status: decision,
        reviewNote: decision === 'NEED_REVISION' ? trimmedNote : null,
        reviewedById: adviser.faculty.userId,
        reviewedAt: new Date(),
      },
    })
    if (result.count === 0) {
      return {
        success: false,
        message:
          'This submission was superseded by a newer version and can no longer be reviewed.',
      }
    }

    const group = submission.milestone.group
    const config = { expire: 0 } as const
    for (const student of group.students) {
      revalidateTag(`workspace-${student.userId}`, config)
    }
    revalidateTag(`journey-${group.id}`, config)
    revalidateTag(`evaluations-${adviser.id}`, config)
    revalidateTag(`my-section-${group.sectionId}`, config)

    return {
      success: true,
      message:
        decision === 'APPROVED'
          ? 'Submission approved.'
          : 'Revision requested for this submission.',
    }
  } catch (error) {
    console.error('[reviewSubmission | Error]:', error)
    return { success: false, message: 'Failed to review the submission.' }
  }
}
