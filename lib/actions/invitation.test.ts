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
jest.mock('@/lib/actions/revalidate', () => ({ revalidateFeature: jest.fn(), revalidateCalendarCache: jest.fn() }))

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
    role: 'GROUP',
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

describe('invitation guards', () => {
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

  test('guards invitation cancellation to managers', async () => {
    managerGuardMock.mockResolvedValue(null)

    const result = await cancelInvitation(700)

    expect(result.success).toBe(false)
    expect(prismaMock.invitation.update).not.toHaveBeenCalled()
  })
})
