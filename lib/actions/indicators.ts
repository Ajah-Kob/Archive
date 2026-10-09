'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag } from 'next/cache'
import { requireUser } from '@/lib/actions/guard'
import { ADVISER_INVITE_TTL_MS } from '@/types/milestones'
import { ADVISER_CAP } from '@/config/constants'

/**
 * Badge counts for sidebar navigation and tab bars, keyed by badge key.
 *
 * Two semantics, never mixed in one key:
 * - Action-required counts (pending work assigned to you) clear when the
 *   work is done — no separate "mark read" step to forget.
 * - Unread informational counts (notification rows) clear on read.
 *
 * Phase 0 keys: `invites` (my pending invitations), `unread` (my unread
 * notification rows). Role-scoped work-queue keys land in Phase 1.
 */
export type IndicatorCounts = Record<string, number>

async function getIndicatorCountsData(userId: number): Promise<IndicatorCounts> {
  'use cache'
  cacheTag(`indicators-${userId}`)
  cacheLife('max')

  // Role resolution mirrors guard.ts but reads the DB directly, so a freshly
  // granted role is reflected without waiting for the ~60s session refresh.
  const [user, faculty, student] = await Promise.all([
    prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { role: true },
    }),
    prisma.faculty.findFirst({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        isProgramChair: true,
        coordinator: { select: { id: true } },
        adviser: { select: { id: true } },
      },
    }),
    prisma.student.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, groupId: true },
    }),
  ])
  if (!user) return {}

  const isAdmin = user.role === 'SUPERADMIN' || user.role === 'ADMIN'
  const staff = isAdmin || faculty?.isProgramChair === true
  const now = new Date()

  // Invitations expire lazily on panel read (see getMyPendingInvitationsData),
  // which a pure count must not do — writing inside a count query would make
  // every sidebar render a mutation. Instead the count applies the same TTL
  // window as a read filter, so expired-but-not-yet-cancelled rows never
  // inflate the badge.
  const cutoff = new Date(Date.now() - ADVISER_INVITE_TTL_MS)
  const myInviteFilter = {
    deletedAt: null,
    status: 'PENDING' as const,
    createdAt: { gte: cutoff },
    OR: [
      { faculty: { userId, deletedAt: null } },
      { student: { userId, deletedAt: null } },
    ],
  }

  type CountTask = Promise<readonly [string, number]>
  const tasks: CountTask[] = [
    (async (): Promise<readonly [string, number]> => [
      'invites',
      await prisma.invitation.count({ where: { ...myInviteFilter } }),
    ])(),
    (async (): Promise<readonly [string, number]> => [
      'unread',
      await prisma.notification.count({ where: { userId, readAt: null } }),
    ])(),
  ]

  // Student: defenses demanding a resubmission. Same predicate as the
  // canResubmit derivation in DefenseTabPanel — verdict in, no revised
  // submission yet.
  if (student?.groupId) {
    const groupId = student.groupId
    tasks.push(
      (async (): Promise<readonly [string, number]> => [
        'resubmit',
        await prisma.defenseSchedule.count({
          where: {
            groupId,
            deletedAt: null,
            verdict: { in: ['MINOR_REVISION', 'MAJOR_REVISION'] },
            submissions: { none: { isInitial: false, deletedAt: null } },
          },
        }),
      ])(),
      (async (): Promise<readonly [string, number]> => [
        'groupInvites',
        await prisma.invitation.count({
          where: {
            deletedAt: null,
            status: 'PENDING',
            role: 'GROUP',
            createdAt: { gte: cutoff },
            student: { userId, deletedAt: null },
          },
        }),
      ])(),
    )
  }

  // Adviser: live PENDING submissions in my groups. Mirrors the
  // reviewSubmission guard (evaluation.ts) — only PENDING rows are reviewable.
  if (faculty?.adviser) {
    const adviserId = faculty.adviser.id
    tasks.push(
      (async (): Promise<readonly [string, number]> => [
        'adviserQueue',
        await prisma.milestoneSubmission.count({
          where: {
            deletedAt: null,
            status: 'PENDING',
            milestone: {
              deletedAt: null,
              group: { deletedAt: null, adviserId },
            },
          },
        }),
      ])(),
    )
  }

  // Panelist (any faculty holding DefensePanelist rows): my undecided
  // defenses, plus the past-date subset nobody is chasing.
  if (faculty) {
    const panelistFilter = {
      deletedAt: null,
      verdict: 'PENDING',
      panelists: { some: { userId, deletedAt: null } },
    } as const
    tasks.push(
      (async (): Promise<readonly [string, number]> => [
        'myVerdicts',
        await prisma.defenseSchedule.count({ where: { ...panelistFilter } }),
      ])(),
      (async (): Promise<readonly [string, number]> => [
        'myVerdictsStale',
        await prisma.defenseSchedule.count({
          where: { ...panelistFilter, date: { lt: now } },
        }),
      ])(),
    )
  }

  // Coordinator: stale defenses in my own sections. Rescheduling is
  // coordinator-owned (rescheduleForRedefense requires coordinator access),
  // so a past-date undecided defense in my section is my action to take.
  if (faculty?.coordinator) {
    tasks.push(
      (async (): Promise<readonly [string, number]> => [
        'myStaleDefenses',
        await prisma.defenseSchedule.count({
          where: {
            deletedAt: null,
            verdict: 'PENDING',
            date: { lt: now },
            group: {
              deletedAt: null,
              section: {
                deletedAt: null,
                coordinator: { faculty: { userId, deletedAt: null } },
              },
            },
          },
        }),
      ])(),
    )
  }

  // Chair / admin: program-wide alert counts. Predicates copied from
  // getAlertsData (chair-dashboard.ts) so the sidebar agrees with the
  // dashboard it links to.
  if (staff) {
    tasks.push(
      (async (): Promise<readonly [string, number]> => [
        'unassignedSections',
        await prisma.section.count({ where: { deletedAt: null, coordinatorId: null } }),
      ])(),
      (async (): Promise<readonly [string, number]> => {
        // Same bucketing as getAlertsData: advisers holding cap or more groups.
        const advisers = await prisma.adviser.findMany({
          where: { deletedAt: null },
          select: { _count: { select: { groups: { where: { deletedAt: null } } } } },
        })
        return [
          'advisersAtCap',
          advisers.filter((a) => a._count.groups >= ADVISER_CAP).length,
        ]
      })(),
      (async (): Promise<readonly [string, number]> => [
        'staleDefenses',
        await prisma.defenseSchedule.count({
          where: { deletedAt: null, verdict: 'PENDING', date: { lt: now } },
        }),
      ])(),
      (async (): Promise<readonly [string, number]> => [
        'pendingVerdicts',
        await prisma.defenseSchedule.count({ where: { deletedAt: null, verdict: 'PENDING' } }),
      ])(),
      (async (): Promise<readonly [string, number]> => [
        'archivingReview',
        await prisma.archivingSubmission.count({
          where: { status: 'IN_REVIEW', deletedAt: null },
        }),
      ])(),
    )
  }

  const entries = await Promise.all(tasks)
  return Object.fromEntries(entries)
}

export async function getIndicatorCounts(): Promise<{
  success: boolean
  message: string
  payload: IndicatorCounts | null
}> {
  const session = await requireUser()
  if (!session?.user?.id) {
    return { success: false, message: 'Unauthorized', payload: null }
  }

  try {
    return {
      success: true,
      message: '',
      payload: await getIndicatorCountsData(+session.user.id),
    }
  } catch {
    return { success: false, message: 'Failed to load indicators.', payload: null }
  }
}
