import { describe, expect, jest, test } from '@jest/globals'
import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/actions/guard'
import { getIndicatorCounts } from './indicators'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    invitation: { count: jest.fn() },
    notification: { count: jest.fn() },
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
  invitation: { count: AsyncMock<number> }
  notification: { count: AsyncMock<number> }
}
const requireUserMock = jest.mocked(requireUser)

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
    requireUserMock.mockResolvedValue({ user: { id: '9' } } as never)
    prismaMock.invitation.count.mockResolvedValue(2)
    prismaMock.notification.count.mockResolvedValue(5)

    const res = await getIndicatorCounts()

    expect(res.success).toBe(true)
    expect(res.payload).toEqual({ invites: 2, unread: 5 })
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
    requireUserMock.mockResolvedValue({ user: { id: '9' } } as never)
    prismaMock.invitation.count.mockResolvedValue(0)
    prismaMock.notification.count.mockResolvedValue(0)

    const res = await getIndicatorCounts()

    expect(res.success).toBe(true)
    expect(res.payload).toEqual({ invites: 0, unread: 0 })
  })

  test('fails closed when the database is down', async () => {
    requireUserMock.mockResolvedValue({ user: { id: '9' } } as never)
    prismaMock.invitation.count.mockRejectedValue(new Error('db down'))

    const res = await getIndicatorCounts()

    expect(res.success).toBe(false)
    expect(res.payload).toBeNull()
  })
})
