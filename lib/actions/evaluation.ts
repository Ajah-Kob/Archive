'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag } from 'next/cache'
import { requireAdviser } from '@/lib/actions/guard'

export interface EvaluationItem {
  id: number
  groupId: number
  groupName: string
  chapter: string
  phase: 'CAPSTONE 1' | 'CAPSTONE 2'
  dateSubmitted: string
  submittedBy: string
  fileName: string
  mimeType: string
  size: number
}

export interface EvaluationVersion {
  id: number
  version: number
  fileName: string
  submittedBy: string
  createdAt: string
  isCurrent: boolean
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

// Returns the live adviser record for the current user, or null.
async function requireAdviserRow() {
  const session = await requireAdviser()
  if (!session) return null
  return prisma.adviser.findFirst({
    where: {
      faculty: { userId: +session.user.id, deletedAt: null },
      deletedAt: null,
    },
    select: { id: true },
  })
}

// Current submissions of the adviser's assigned groups, newest first. A
// "current" submission is the live (non-soft-deleted) row of a milestone —
// previous versions are the soft-deleted rows in the same milestone.
async function getEvaluationsData(adviserId: number) {
  'use cache'
  cacheTag(`evaluations-${adviserId}`)
  cacheLife('max')

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
        select: { chapter: true, phase: true, groupId: true },
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
      mimeType: s.mimeType,
      size: s.size,
    }),
  )
}

export async function getEvaluations() {
  const adviser = await requireAdviserRow()
  if (!adviser) {
    return { success: false, message: 'Not authorized', payload: null }
  }

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
// createdAt. Not 'use cache': the drawer fetches on open so it stays fresh.
export async function getEvaluationVersions(submissionId: number) {
  const adviser = await requireAdviserRow()
  if (!adviser) {
    return { success: false, message: 'Not authorized', payload: null }
  }

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
      submittedBy: s.user.name,
      createdAt: s.createdAt.toISOString(),
      isCurrent: !s.deletedAt,
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