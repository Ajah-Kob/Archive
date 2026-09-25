import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { Session } from 'next-auth'
import prisma from '@/lib/prisma'
import { revalidateTag, updateTag } from 'next/cache'
import { requireAdminOrProgramChair, requireUser } from '@/lib/actions/guard'
import { revalidateFeature } from '@/lib/actions/revalidate'
import { audit } from '@/lib/actions/audit'
import { assignCoordinatorRole } from './coordinator'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    faculty: { findFirst: jest.fn(), findMany: jest.fn() },
    coordinator: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    notification: { create: jest.fn() },
    section: { count: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
  updateTag: jest.fn(),
}))

jest.mock('@/lib/actions/guard', () => ({
  requireAdminOrProgramChair: jest.fn(),
  requireUser: jest.fn(),
}))

jest.mock('@/lib/actions/sectionAuthorization', () => ({
  requireGlobalSectionManager: jest.fn(),
  sectionUnauthorized: { success: false, payload: null, message: 'Unauthorized' },
}))

jest.mock('@/lib/actions/revalidate', () => ({ revalidateFeature: jest.fn() }))
jest.mock('@/lib/actions/audit', () => ({ audit: jest.fn() }))

type AsyncMock<Result> = jest.MockedFunction<
  (args: unknown) => Promise<Result>
>

type PrismaMock = {
  faculty: { findFirst: AsyncMock<unknown> }
  coordinator: { upsert: AsyncMock<unknown> }
  notification: { create: AsyncMock<unknown> }
  $transaction: jest.MockedFunction<
    (operations: Promise<unknown>[]) => Promise<unknown[]>
  >
}

type FacultyRow = {
  id: number
  userId: number
  isProgramChair: boolean
  coordinator: { id: number; deletedAt: Date | null } | null
  user: { id: number; name: string }
}

const FACULTY_ID = 300
const USER_ID = 900
const COORDINATOR_ID = 44

const chairSession: Session = {
  expires: '2099-01-01T00:00:00.000Z',
  user: {
    id: String(USER_ID),
    name: 'Program Chair',
    email: 'chair@example.com',
    role: 'FACULTY',
    isProgramChair: true,
  },
}

const facultyRow = (
  overrides: Partial<FacultyRow> = {},
): FacultyRow => ({
  id: FACULTY_ID,
  userId: USER_ID,
  isProgramChair: false,
  coordinator: null,
  user: { id: USER_ID, name: 'Eligible Faculty' },
  ...overrides,
})

const coordinatorRecord = {
  id: COORDINATOR_ID,
  facultyId: FACULTY_ID,
  deletedAt: null,
  faculty: {
    user: {
      id: USER_ID,
      name: 'Eligible Faculty',
      email: 'faculty@example.com',
      image: null,
      avatarGradient: 'linear-gradient(135deg, #707dff, #5062f5)',
    },
  },
}

const prismaMock = prisma as unknown as PrismaMock
const managerGuardMock = jest.mocked(requireAdminOrProgramChair)
const userGuardMock = jest.mocked(requireUser)
const revalidateTagMock = jest.mocked(revalidateTag)
const updateTagMock = jest.mocked(updateTag)
const revalidateFeatureMock = jest.mocked(revalidateFeature)
const auditMock = jest.mocked(audit)

describe('assignCoordinatorRole', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    managerGuardMock.mockReset().mockResolvedValue(chairSession)
    userGuardMock.mockReset().mockResolvedValue(chairSession)
    revalidateTagMock.mockReset()
    updateTagMock.mockReset()
    revalidateFeatureMock.mockReset()
    auditMock.mockReset().mockResolvedValue(undefined)

    prismaMock.faculty.findFirst
      .mockReset()
      .mockResolvedValue(facultyRow())
    prismaMock.coordinator.upsert
      .mockReset()
      .mockResolvedValue(coordinatorRecord)
    prismaMock.notification.create.mockReset().mockResolvedValue({ id: 1 })
    prismaMock.$transaction
      .mockReset()
      .mockImplementation(async (operations) => Promise.all(operations))
  })

  test('denies callers without live manager authorization', async () => {
    managerGuardMock.mockResolvedValue(null)

    const result = await assignCoordinatorRole(FACULTY_ID)

    expect(result).toEqual({
      success: false,
      payload: null,
      message: 'You are not authorized to perform this action.',
    })
    expect(prismaMock.faculty.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  test.each([0, -1, 1.5, Number.NaN])(
    'rejects invalid faculty id %p before reading the database',
    async (facultyId) => {
      const result = await assignCoordinatorRole(facultyId)

      expect(result).toEqual({
        success: false,
        payload: null,
        message: 'Invalid faculty id.',
      })
      expect(prismaMock.faculty.findFirst).not.toHaveBeenCalled()
    },
  )

  test('rejects missing or deleted faculty chains', async () => {
    prismaMock.faculty.findFirst.mockResolvedValue(null)

    const result = await assignCoordinatorRole(FACULTY_ID)

    expect(result).toEqual({
      success: false,
      payload: null,
      message: 'Faculty not found.',
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  test('rejects a faculty member who is already an active coordinator', async () => {
    prismaMock.faculty.findFirst.mockResolvedValue(
      facultyRow({ coordinator: { id: COORDINATOR_ID, deletedAt: null } }),
    )

    const result = await assignCoordinatorRole(FACULTY_ID)

    expect(result).toEqual({
      success: false,
      payload: null,
      message: 'This faculty member is already a coordinator.',
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  test('creates the role and notification in one transaction', async () => {
    const result = await assignCoordinatorRole(FACULTY_ID)

    expect(prismaMock.coordinator.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { facultyId: FACULTY_ID },
        create: { facultyId: FACULTY_ID },
        update: { deletedAt: null },
      }),
    )
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        title: 'Coordinator role assigned',
        body: 'You have been assigned as a Coordinator and can now access coordinator features.',
        href: '/faculty',
      },
    })
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(auditMock).toHaveBeenCalledWith({
      action: 'COORDINATOR_ASSIGN',
      entity: 'COORDINATOR',
      entityId: String(COORDINATOR_ID),
      entityName: 'Eligible Faculty',
      before: { facultyId: FACULTY_ID, active: false },
      after: { facultyId: FACULTY_ID, active: true },
    })
    expect(updateTagMock).toHaveBeenCalledWith('coordinators')
    expect(updateTagMock).toHaveBeenCalledWith('faculty')
    expect(revalidateFeatureMock).toHaveBeenCalledWith('faculties')
    expect(revalidateFeatureMock).toHaveBeenCalledWith('sections')
    expect(result).toEqual({
      success: true,
      message: 'Eligible Faculty assigned as Coordinator.',
      payload: coordinatorRecord,
    })
  })

  test('revives a soft-deleted coordinator record', async () => {
    prismaMock.faculty.findFirst.mockResolvedValue(
      facultyRow({
        coordinator: {
          id: COORDINATOR_ID,
          deletedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      }),
    )

    const result = await assignCoordinatorRole(FACULTY_ID)

    expect(result.success).toBe(true)
    expect(prismaMock.coordinator.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { deletedAt: null } }),
    )
  })

  test('allows a Program Chair to assign themselves', async () => {
    prismaMock.faculty.findFirst.mockResolvedValue(
      facultyRow({
        isProgramChair: true,
        user: { id: USER_ID, name: 'Program Chair' },
      }),
    )

    const result = await assignCoordinatorRole(FACULTY_ID)

    expect(result).toEqual({
      success: true,
      message: 'Program Chair assigned as Coordinator.',
      payload: coordinatorRecord,
    })
  })

  test('preserves the role when notification creation fails', async () => {
    prismaMock.notification.create.mockRejectedValue(new Error('db down'))

    const result = await assignCoordinatorRole(FACULTY_ID)

    expect(result).toEqual({
      success: false,
      payload: null,
      message: 'Failed to assign coordinator role.',
    })
    expect(auditMock).not.toHaveBeenCalled()
    expect(updateTagMock).not.toHaveBeenCalled()
  })

  test('returns an already-assigned response on a uniqueness race', async () => {
    prismaMock.$transaction.mockRejectedValue({ code: 'P2002' })

    const result = await assignCoordinatorRole(FACULTY_ID)

    expect(result).toEqual({
      success: false,
      payload: null,
      message: 'This faculty member is already a coordinator.',
    })
  })
})
