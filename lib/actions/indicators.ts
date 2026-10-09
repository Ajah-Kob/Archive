'use server'

import prisma from '@/lib/prisma'
import { cacheLife, cacheTag } from 'next/cache'
import { requireUser } from '@/lib/actions/guard'
import { ADVISER_INVITE_TTL_MS } from '@/types/milestones'

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

  // Invitations expire lazily on panel read (see getMyPendingInvitationsData),
  // which a pure count must not do — writing inside a count query would make
  // every sidebar render a mutation. Instead the count applies the same TTL
  // window as a read filter, so expired-but-not-yet-cancelled rows never
  // inflate the badge.
  const cutoff = new Date(Date.now() - ADVISER_INVITE_TTL_MS)

  const [invites, unread] = await Promise.all([
    prisma.invitation.count({
      where: {
        deletedAt: null,
        status: 'PENDING',
        createdAt: { gte: cutoff },
        OR: [
          { faculty: { userId, deletedAt: null } },
          { student: { userId, deletedAt: null } },
        ],
      },
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ])

  return { invites, unread }
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
