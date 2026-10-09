import { describe, expect, jest, test } from '@jest/globals'
import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'
import { getIndicatorCounts } from './indicators'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findFirst: jest.fn() },
    faculty: { findFirst: jest.fn() },
    student: { findFirst: jest.fn() },
    invitation: { count: jest.fn() },
    notification: { count: jest.fn() },
    defenseSchedule: { count: jest.fn() },
    milestoneSubmission: { count: jest.fn() },
    section: { count: jest.fn() },
    adviser: { findMany: jest.fn() },
    archivingSubmission: { count: jest.fn() },
  },
}))

jest.mock('@/lib/actions/guard', () => ({
  requireUser: jest.fn(),
}))

jest.mock('next/cache', () => ({
  cacheLife: jest.fn(),
  cacheTag: jest.fn(),
  revalidateTag: jest.fn(),
}))

type AsyncMock<Result> = jest.MockedFunction<(args: unknown) => Promise<Result>>

const prismaMock = prisma as unknown as {
  user: { findFirst: AsyncMock<unknown> }
  faculty: { findFirst: AsyncMock<unknown> }
  student: { findFirst: AsyncMock<unknown> }
  invitation: { count: AsyncMock<number> }
  notification: { count: AsyncMock<number> }
  defenseSchedule: { count: AsyncMock<number> }
  milestoneSubmission: { count: AsyncMock<number> }
  section: { count: AsyncMock<number> }
  adviser: { findMany: AsyncMock<unknown[]> }
  archivingSubmission: { count: AsyncMock<number> }
}
const requireUserMock = jest.mocked(requireUser)

function mockRoles({
  role = 'STUDENT',
  faculty = null,
  student = null,
}: {
  role?: string
  faculty?: unknown
  student?: unknown
}) {
  requireUserMock.mockResolvedValue({ user: { id: '9' } } as never)
  prismaMock.user.findFirst.mockResolvedValue({ role })
  prismaMock.faculty.findFirst.mockResolvedValue(faculty)
  prismaMock.student.findFirst.mockResolvedValue(student)
  prismaMock.invitation.count.mockResolvedValue(0)
  prismaMock.notification.count.mockResolvedValue(0)
  prismaMock.defenseSchedule.count.mockResolvedValue(0)
  prismaMock.milestoneSubmission.count.mockResolvedValue(0)
  prismaMock.section.count.mockResolvedValue(0)
  prismaMock.adviser.findMany.mockResolvedValue([])
  prismaMock.archivingSubmission.count.mockResolvedValue(0)
}

describe('getIndicatorCounts', () => {
  test('rejects signed-out callers without touching the database', async () => {
    requireUserMock.mockResolvedValue(null)

    const res = await getIndicatorCounts()

    expect(res.success).toBe(false)
    expect(res.payload).toBeNull()
    expect(prismaMock.invitation.count).not.toHaveBeenCalled()
    expect(prismaMock.notification.count).not.toHaveBeenCalled()
  })

  test('returns per-key counts for the session user', async () => {
    mockRoles({ role: 'STUDENT' })
    prismaMock.invitation.count.mockResolvedValue(2)
    prismaMock.notification.count.mockResolvedValue(5)

    const res = await getIndicatorCounts()

    expect(res.success).toBe(true)
    expect(res.payload).toMatchObject({ invites: 2, unread: 5 })
    // Scoped to the caller — never a client-supplied id.
    expect(prismaMock.invitation.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ faculty: { userId: 9, deletedAt: null } }, { student: { userId: 9, deletedAt: null } }],
        }),
      }),
    )
    expect(prismaMock.notification.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 9, readAt: null } }),
    )
  })

  test('returns zeros rather than failing when the queues are empty', async () => {
    mockRoles({ role: 'STUDENT' })

    const res = await getIndicatorCounts()

    expect(res.success).toBe(true)
    expect(res.payload).toMatchObject({ invites: 0, unread: 0 })
  })

  test('fails closed when the database is down', async () => {
    requireUserMock.mockResolvedValue({ user: { id: '9' } } as never)
    prismaMock.user.findFirst.mockRejectedValue(new Error('db down'))

    const res = await getIndicatorCounts()

    expect(res.success).toBe(false)
    expect(res.payload).toBeNull()
  })

  test('student with a group gets resubmit and group-invite keys, no staff keys', async () => {
    mockRoles({ role: 'STUDENT', student: { id: 3, groupId: 7 } })
    prismaMock.defenseSchedule.count.mockResolvedValue(1)
    prismaMock.invitation.count.mockResolvedValue(1)

    const res = await getIndicatorCounts()

    expect(res.success).toBe(true)
    expect(res.payload?.resubmit).toBe(1)
    expect(res.payload?.groupInvites).toBe(1)
    expect(res.payload).not.toHaveProperty('archivingReview')
    expect(res.payload).not.toHaveProperty('adviserQueue')
    expect(res.payload).not.toHaveProperty('pendingVerdicts')
  })

  test('adviser gets a review-queue key scoped to their groups', async () => {
    mockRoles({ role: 'FACULTY', faculty: { id: 5, isProgramChair: false } })
    // faculty without an adviser record: no queue key at all.
    const plain = await getIndicatorCounts()
    expect(plain.payload).not.toHaveProperty('adviserQueue')

    mockRoles({
      role: 'FACULTY',
      faculty: { id: 5, isProgramChair: false, adviser: { id: 11 } },
    })
    prismaMock.milestoneSubmission.count.mockResolvedValue(3)

    const res = await getIndicatorCounts()

    expect(res.payload?.adviserQueue).toBe(3)
    expect(prismaMock.milestoneSubmission.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          milestone: expect.objectContaining({
            group: expect.objectContaining({ adviserId: 11 }),
          }),
        }),
      }),
    )
  })

  test('program chair gets staff keys, plain faculty does not', async () => {
    mockRoles({ role: 'FACULTY', faculty: { id: 5, isProgramChair: false } })

    const plain = await getIndicatorCounts()

    expect(plain.payload).not.toHaveProperty('archivingReview')
    expect(plain.payload).not.toHaveProperty('pendingVerdicts')

    mockRoles({ role: 'FACULTY', faculty: { id: 5, isProgramChair: true } })
    prismaMock.archivingSubmission.count.mockResolvedValue(2)

    const res = await getIndicatorCounts()

    expect(res.payload).toHaveProperty('archivingReview', 2)
    expect(res.payload).toHaveProperty('pendingVerdicts')
    expect(res.payload).toHaveProperty('unassignedSections')
  })

  test('coordinator gets stale defenses in their own sections only', async () => {
    mockRoles({
      role: 'FACULTY',
      faculty: { id: 5, isProgramChair: false, coordinator: { id: 9 } },
    })
    prismaMock.defenseSchedule.count.mockResolvedValue(1)

    const res = await getIndicatorCounts()

    expect(res.payload?.myStaleDefenses).toBe(1)
    expect(prismaMock.defenseSchedule.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          verdict: 'PENDING',
          group: expect.objectContaining({
            section: expect.objectContaining({
              coordinator: expect.objectContaining({
                faculty: expect.objectContaining({ userId: 9 }),
              }),
            }),
          }),
        }),
      }),
    )
  })

  test('guest sees only invites and unread', async () => {
    mockRoles({ role: 'GUEST' })

    const res = await getIndicatorCounts()

    expect(res.success).toBe(true)
    expect(Object.keys(res.payload ?? {}).sort()).toEqual(['invites', 'unread'])
  })
})
