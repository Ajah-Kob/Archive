'use server'

import { revalidateTag } from 'next/cache'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireStudent, unauthorized } from '@/lib/actions/guard'
import { revalidateFeature } from '@/lib/actions/revalidate'

// ───────────────────────────── Helpers ─────────────────────────────

// Resolves the calling student's live group, mirrors student-review.ts.
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
  return { groupId: student.group.id, userId: +session.user.id }
}

async function findStudentDefenseSubmission(submissionId: number, groupId: number) {
  return prisma.defenseSubmission.findFirst({
    where: {
      id: submissionId,
      schedule: {
        deletedAt: null,
        group: { id: groupId, deletedAt: null },
      },
    },
    select: { id: true, scheduleId: true },
  })
}

function getAnnotationId(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null
  const annotation = (item as { annotation?: { id?: unknown } }).annotation
  if (!annotation || typeof annotation.id !== 'string') return null
  return annotation.id
}

// ───────────────────────────── Visibility helpers (pure) ───────────────

// Whether an AnnotationTransferItem is visible to the panelist. Items without
// an explicit isVisible are treated as visible (default true).
function isAnnotationVisible(item: unknown): boolean {
  if (!item || typeof item !== 'object') return true
  const visible = (item as { isVisible?: unknown }).isVisible
  return visible !== false
}

// ───────────────────── toggleDefenseAnnotationVisibility ───────────────

/**
 * Student toggles visibility of a single annotation on their defense submission.
 * Visibility is stored as `isVisible` boolean on the AnnotationTransferItem JSON
 * inside DefenseSubmissionAnnotation.data (per-annotation, not per-row).
 *
 * The student's submission ownership is verified via their group (schedule.group).
 * Only COMMITTED rows are considered — DRAFT rows are panelist-private and
 * never visible to students, so toggling them is a no-op.
 *
 * On success revalidates both the panelist per-author cache tag and the student's
 * merged annotations tag so subsequent reads reflect the new visibility.
 */
export async function toggleDefenseAnnotationVisibility(
  submissionId: number,
  annotationId: string,
  isVisible: boolean,
) {
  const ctx = await requireStudentGroup()
  if (!ctx) return { ...unauthorized }

  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    return { success: false, message: 'Invalid submission.' }
  }
  if (typeof annotationId !== 'string' || annotationId.length === 0) {
    return { success: false, message: 'Invalid annotation.' }
  }
  if (typeof isVisible !== 'boolean') {
    return { success: false, message: 'Invalid visibility value.' }
  }

  try {
    const submission = await findStudentDefenseSubmission(submissionId, ctx.groupId)
    if (!submission) {
      return {
        success: false,
        message: 'Submission not found in your group.',
      }
    }

    const rows = await (prisma as any).defenseSubmissionAnnotation.findMany({
      where: {
        submissionId,
        status: 'COMMITTED',
        deletedAt: null,
      },
      select: { id: true, authorId: true, data: true },
    })

    if (!rows || rows.length === 0) {
      return { success: false, message: 'No annotations found for this submission.' }
    }

    let targetRow: { id: number; authorId: number; data: unknown } | null = null
    for (const row of rows as { id: number; authorId: number; data: unknown }[]) {
      const data = row.data
      if (!Array.isArray(data)) continue
      const hasAnnotation = (data as unknown[]).some(
        (item) => getAnnotationId(item) === annotationId,
      )
      if (hasAnnotation) {
        targetRow = row
        break
      }
    }

    if (!targetRow) {
      return { success: false, message: 'Annotation not found.' }
    }

    const currentData = Array.isArray(targetRow.data)
      ? (targetRow.data as unknown[])
      : []

    const updatedData = currentData.map((item) => {
      if (getAnnotationId(item) === annotationId) {
        if (!item || typeof item !== 'object') return item
        return { ...(item as Record<string, unknown>), isVisible }
      }
      return item
    })

    await (prisma as any).defenseSubmissionAnnotation.update({
      where: { id: targetRow.id },
      data: { data: updatedData as Prisma.InputJsonValue },
    })

    const tagConfig = { expire: 0 } as const
    // Per-author panelist tag — this is the cache getDefenseAnnotations uses.
    // Student toggle must immediately reflect in panelist view, so expire:0.
    revalidateTag(
      `defense-submission-${submissionId}-annotations-${targetRow.authorId}`,
      tagConfig,
    )
    // Generic merged tag and student tag for the student view.
    revalidateTag(`defense-submission-${submissionId}-annotations`, tagConfig)
    revalidateTag(
      `defense-student-annotations-${submissionId}-${ctx.userId}`,
      tagConfig,
    )
    // Also bust any defense-wide tag that might cache the submission list / session page.
    revalidateTag('defense', tagConfig)
    revalidateFeature('defense')

    // For redundancy, revalidate all panelists of this schedule so any
    // panelist who opens the same submission sees consistent visibility.
    try {
      const panelists = await prisma.defensePanelist.findMany({
        where: { defenseScheduleId: submission.scheduleId, deletedAt: null },
        select: { userId: true },
      })
      for (const p of panelists) {
        if (p.userId !== targetRow.authorId) {
          revalidateTag(
            `defense-submission-${submissionId}-annotations-${p.userId}`,
            tagConfig,
          )
        }
      }
    } catch {
      // Best-effort: visibility is already updated on the owning row.
    }

    return {
      success: true,
      message: isVisible ? 'Annotation shown to panelists.' : 'Annotation hidden from panelists.',
    }
  } catch (error) {
    console.error('[toggleDefenseAnnotationVisibility | Error]:', error)
    return { success: false, message: 'Failed to update visibility.' }
  }
}
