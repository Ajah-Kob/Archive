import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { Session } from 'next-auth'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/actions/guard'
import { requireAdminOrProgramChair } from '@/lib/actions/guard'
import { revalidateTag } from 'next/cache'
import { addAdviser } from '@/lib/actions/adviser'
import {
  acceptInvitation,
  cancelInvitation,
  getMyPendingInvitations,
  getPendingCoordinatorInvitations,
  sendInvitation,
} from './invitation'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    invitation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    faculty: { findFirst: jest.fn(), findMany: jest.fn() },
    student: { findFirst: jest.fn() },
    group: { findFirst: jest.fn(), update: jest.fn() },
    section: { findFirst: jest.fn(), update: jest.fn() },
    adviser: { upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/actions/guard', () => ({
  getSession: jest.fn(),
  requireAdminOrProgramChair: jest.fn(),
  unauthorized: {
    success: false,
    payload: null,
    message: 'You are not authorized to perform this action.',
  },
}))

jest.mock('next/cache', () => ({
  cacheLife: jest.fn(),
  cacheTag: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock('@/lib/actions/adviser', () => ({ addAdviser: jest.fn() }))
jest.mock('@/lib/actions/revalidate', () => ({ revalidateFeature: jest.fn() }))

type AsyncMock<Result> = jest.MockedFunction<
  (args: unknown) => Promise<Result>
>

type PrismaMock = {
  invitation: {
    findMany: AsyncMock<unknown[]>
    findFirst: AsyncMock<unknown>
    create: AsyncMock<unknown>
    update: AsyncMock<unknown>
    updateMany: AsyncMock<{ count: number }>
  }
  faculty: { findFirst: AsyncMock<unknown> }
}

const prismaMock = prisma as unknown as PrismaMock
const getSessionMock = jest.mocked(getSession)
const managerGuardMock = jest.mocked(requireAdminOrProgramChair)
const revalidateTagMock = jest.mocked(revalidateTag)
const addAdviserMock = jest.mocked(addAdviser)

const chairSession: Session = {
  expires: '2099-01-01T00:00:00.000Z',
  user: {
    id: '900',
    name: 'Program Chair',
    email: 'chair@example.com',
    role: 'FACULTY',
    isProgramChair: true,
  },
}

const facultySession: Session = {
  expires: '2099-01-01T00:00:00.000Z',
  user: {
    id: '901',
    name: 'Invited Faculty',
    email: 'faculty@example.com',
    role: 'FACULTY',
  },
}

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 700,
    facultyId: 300,
    studentId: null,
    groupId: null,
    role: 'COORDINATOR',
    invitedById: 900,
    status: 'PENDING',
    readAt: null,
    deletedAt: null,
    faculty: { id: 300, userId: 901 },
    student: null,
    group: null,
    invitedBy: { id: 900 },
    ...overrides,
  }
}

describe('coordinator invitation compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getSessionMock.mockReset().mockResolvedValue(facultySession)
    managerGuardMock.mockReset().mockResolvedValue(chairSession)
    revalidateTagMock.mockReset()
    addAdviserMock.mockReset()

    prismaMock.invitation.findMany.mockReset().mockResolvedValue([])
    prismaMock.invitation.findFirst.mockReset().mockResolvedValue(invitation())
    prismaMock.invitation.create.mockReset().mockResolvedValue(invitation())
    prismaMock.invitation.update
      .mockReset()
      .mockResolvedValue(invitation({ status: 'CANCELLED' }))
    prismaMock.invitation.updateMany
      .mockReset()
      .mockResolvedValue({ count: 0 })
    prismaMock.faculty.findFirst
      .mockReset()
      .mockResolvedValue({ userId: 901 })
  })

  test('rejects new Coordinator invitations as immediate assignments', async () => {
    const result = await sendInvitation(300, 'COORDINATOR')

    expect(result).toEqual({
      success: false,
      message:
        'Coordinator assignments are immediate and no longer require an invitation.',
      payload: null,
    })
    expect(prismaMock.invitation.create).not.toHaveBeenCalled()
  })

  test('keeps the existing invitation flow for Adviser assignments', async () => {
    prismaMock.invitation.findFirst.mockResolvedValue(null)

    const result = await sendInvitation(300, 'ADVISER')

    expect(result.success).toBe(true)
    expect(prismaMock.invitation.create).toHaveBeenCalledWith({
      data: {
        facultyId: 300,
        role: 'ADVISER',
        invitedById: 900,
        status: 'PENDING',
      },
    })
  })

  test('cancels a legacy Coordinator invitation instead of accepting it', async () => {
    prismaMock.invitation.findFirst.mockResolvedValue(
      invitation({ faculty: { id: 300, userId: 901 } }),
    )
    getSessionMock.mockResolvedValue(facultySession)

    const result = await acceptInvitation(700)

    expect(result).toEqual({
      success: false,
      payload: null,
      message:
        'Coordinator assignments are now immediate and no longer require acceptance.',
    })
    expect(prismaMock.invitation.update).toHaveBeenCalledWith({
      where: { id: 700 },
      data: { status: 'CANCELLED', readAt: expect.any(Date) },
    })
    expect(addAdviserMock).not.toHaveBeenCalled()
    expect(revalidateTagMock).toHaveBeenCalledWith('my-invitations-901', 'max')
  })

  test('lazily hides and cancels legacy Coordinator invitations on invitee reads', async () => {
    const result = await getMyPendingInvitations(901)

    expect(prismaMock.invitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: 'COORDINATOR',
          faculty: { userId: 901 },
        }),
        data: { status: 'CANCELLED' },
      }),
    )
    expect(result).toEqual({ success: true, payload: [] })
  })

  test('guards pending Coordinator invitation reads to managers', async () => {
    managerGuardMock.mockResolvedValue(null)

    const result = await getPendingCoordinatorInvitations('COORDINATOR')

    expect(result.success).toBe(false)
    expect(prismaMock.invitation.findMany).not.toHaveBeenCalled()
  })

  test('guards invitation cancellation to managers', async () => {
    managerGuardMock.mockResolvedValue(null)

    const result = await cancelInvitation(700)

    expect(result.success).toBe(false)
    expect(prismaMock.invitation.update).not.toHaveBeenCalled()
  })
})
