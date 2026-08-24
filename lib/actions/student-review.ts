'use server'

import prisma from '@/lib/prisma'
import { requireStudent, unauthorized } from '@/lib/actions/guard'
import type { SubmissionViewStatus } from '@/types/milestones'

/**
 * Student-side READ actions for the document review workspace.
 *
 * Students can open any version of their group's chapter submissions and view
 * the adviser's COMMITTED annotations. Everything here is read-only: the
 * mutation APIs (saveAnnotationDraft / commitAnnotations / reviewSubmission)
 * are adviser-gated, so a student has no write path.
 */

export interface StudentVersionDetail {
  id: number
  groupName: string
  chapterKey: string
  chapter: string
  phase: 'CAPSTONE 1' | 'CAPSTONE 2'
  dateSubmitted: string
  submittedBy: string
  fileName: string
  blobUrl: string
  mimeType: string
  size: number
  status: 'PENDING' | 'NEED_REVISION' | 'APPROVED'
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  isCurrent: boolean
}

export interface StudentVersionListItem {
  id: number
  version: number
  status: SubmissionViewStatus
  submittedAt: string
  isCurrent: boolean
}

// Resolves the calling student's live group (mirrors getChapterData's
// membership check), or null when the session is not a student in a group.
async function requireStudentGroup() {
  const session = await requireStudent()
  if (!session?.user?.id) return null
  const student = await prisma.student.findFirst({
    where: { userId: +session.user.id, deletedAt: null },
    select: {
      id: true,
      group: {
        where: { deletedAt: null },
        select: {
          id: true,
          students: { where: { deletedAt: null }, select: { id: true } },
        },
      },
    },
  })
  if (!student?.group) return null
  const isMember = student.group.students.some((s) => s.id === student.id)
  if (!isMember) return null
  return { groupId: student.group.id }
}

// Ownership scope shared by all three reads: the submission's milestone must
// belong to the student's live group. Superseded (soft-deleted) versions are
// intentionally INCLUDED — students may view history.
async function findGroupSubmission(submissionId: number, groupId: number) {
  return prisma.milestoneSubmission.findFirst({
    where: {
      id: submissionId,
      milestone: {
        deletedAt: null,
        group: { id: groupId, deletedAt: null },
      },
    },
    select: { id: true, milestoneId: true },
  })
}

// One specific version of the student's group — any version, current or not.
export async function getStudentVersionDetail(submissionId: number) {
  const ctx = await requireStudentGroup()
  if (!ctx) return { ...unauthorized, payload: null }

  try {
    const submission = await prisma.milestoneSubmission.findFirst({
      where: {
        id: submissionId,
        milestone: {
          deletedAt: null,
          group: { id: ctx.groupId, deletedAt: null },
        },
      },
      include: {
        milestone: {
          select: {
            chapter: true,
            phase: true,
            group: { select: { id: true, groupName: true } },
          },
        },
        user: { select: { name: true } },
        reviewedBy: { select: { name: true } },
      },
    })
    if (!submission) {
      return { success: false, message: 'Submission not found.', payload: null }
    }

    const payload: StudentVersionDetail = {
      id: submission.id,
      groupName: submission.milestone.group.groupName,
      chapterKey: submission.milestone.chapter,
      chapter: submission.milestone.chapter.replace('CHAPTER_', 'Chapter '),
      phase: submission.milestone.phase === 'CAPSTONE_2' ? 'CAPSTONE 2' : 'CAPSTONE 1',
      dateSubmitted: submission.createdAt.toISOString(),
      submittedBy: submission.user.name,
      fileName: submission.fileName,
      blobUrl: submission.blobUrl,
      mimeType: submission.mimeType,
      size: submission.size,
      status: submission.status,
      reviewedBy: submission.reviewedBy?.name ?? null,
      reviewedAt: submission.reviewedAt ? submission.reviewedAt.toISOString() : null,
      reviewNote: submission.reviewNote,
      isCurrent: submission.deletedAt == null,
    }

    return { success: true, message: '', payload }
  } catch (error) {
    console.error('[getStudentVersionDetail | Error]:', error)
    return { success: false, message: 'Failed to load submission.', payload: null }
  }
}

// The adviser's COMMITTED annotations for a submission — merged across
// authors. DRAFT rows are adviser-private and never exposed to students.
export async function getStudentSubmissionAnnotations(submissionId: number) {
  const ctx = await requireStudentGroup()
  if (!ctx) return { ...unauthorized, payload: null }

  try {
    const submission = await findGroupSubmission(submissionId, ctx.groupId)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your group.',
        payload: null,
      }
    }

    const rows = await prisma.submissionAnnotation.findMany({
      where: {
        submissionId,
        status: 'COMMITTED',
        deletedAt: null,
      },
      select: { data: true },
    })

    const data = rows.flatMap((row) => (Array.isArray(row.data) ? row.data : []))

    return { success: true, message: '', payload: { data } }
  } catch (error) {
    console.error('[getStudentSubmissionAnnotations | Error]:', error)
    return {
      success: false,
      message: 'Failed to load annotations.',
      payload: null,
    }
  }
}

// All versions of the chapter the submission belongs to, latest first —
// powers the student Version panel.
export async function getStudentVersionList(submissionId: number) {
  const ctx = await requireStudentGroup()
  if (!ctx) return { ...unauthorized, payload: null }

  try {
    const submission = await findGroupSubmission(submissionId, ctx.groupId)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your group.',
        payload: null,
      }
    }

    const chain = await prisma.milestoneSubmission.findMany({
      where: { milestoneId: submission.milestoneId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        deletedAt: true,
      },
    })

    const items: StudentVersionListItem[] = chain.map((row, index): StudentVersionListItem => ({
      id: row.id,
      version: index + 1,
      status:
        row.status === 'APPROVED'
          ? 'APPROVED'
          : row.status === 'NEED_REVISION'
            ? 'NEEDS_REVISION'
            : 'IN_REVIEW',
      submittedAt: row.createdAt.toISOString(),
      isCurrent: row.deletedAt == null,
    })).reverse()

    return { success: true, message: '', payload: items }
  } catch (error) {
    console.error('[getStudentVersionList | Error]:', error)
    return { success: false, message: 'Failed to load versions.', payload: null }
  }
}
