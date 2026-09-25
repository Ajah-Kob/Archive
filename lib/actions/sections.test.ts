import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth'
import { revalidateTag, updateTag } from 'next/cache'
import prisma from '@/lib/prisma'
import { revalidateFeature } from '@/lib/actions/revalidate'
import {
  requireGlobalSectionManager,
  sectionUnauthorized,
} from '@/lib/actions/sectionAuthorization'
import { audit } from '@/lib/actions/audit'
import {
  archiveSection,
  getSections,
  joinSectionWithCode,
  reassignSectionCoordinator,
  softDeleteSection,
} from './sections'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    section: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    coordinator: { findFirst: jest.fn() },
    student: { count: jest.fn() },
    group: { count: jest.fn() },
    joinCode: { findFirst: jest.fn(), updateMany: jest.fn() },
    user: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock('next/cache', () => ({
  cacheLife: jest.fn(),
  cacheTag: jest.fn(),
  revalidateTag: jest.fn(),
  updateTag: jest.fn(),
}))

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/authOptions', () => ({ authOptions: {} }))
jest.mock('@/lib/actions/revalidate', () => ({ revalidateFeature: jest.fn() }))
jest.mock('@/lib/actions/sectionAuthorization', () => ({
  authorizeSectionAccess: jest.fn(),
  requireGlobalSectionManager: jest.fn(),
  sectionUnauthorized: {
    success: false,
    payload: null,
    message: 'You are not authorized to perform this action.',
  },
}))
jest.mock('@/lib/actions/guard', () => ({ requireCoordinator: jest.fn() }))
jest.mock('@/lib/actions/audit', () => ({ audit: jest.fn() }))

type AsyncMock<Result> = jest.MockedFunction<
  (args: unknown) => Promise<Result>
>

type TransactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel
  maxWait: number
  timeout: number
}

type TransactionMock = {
  $queryRaw: jest.MockedFunction<
    (...args: unknown[]) => Promise<{ id: number }[]>
  >
  section: {
    findFirst: AsyncMock<unknown>
    updateMany: AsyncMock<{ count: number }>
  }
  student: {
    count: AsyncMock<number>
    findFirst: AsyncMock<unknown>
    create: AsyncMock<unknown>
    update: AsyncMock<unknown>
  }
  group: { count: AsyncMock<number> }
  joinCode: {
    findFirst: AsyncMock<unknown>
    updateMany: AsyncMock<{ count: number }>
  }
  user: { update: AsyncMock<unknown> }
}

type PrismaMock = {
  section: {
    findMany: AsyncMock<unknown[]>
    findFirst: AsyncMock<unknown>
    updateMany: AsyncMock<{ count: number }>
  }
  coordinator: { findFirst: AsyncMock<unknown> }
  student: { count: AsyncMock<number> }
  group: { count: AsyncMock<number> }
  joinCode: {
    findFirst: AsyncMock<unknown>
    updateMany: AsyncMock<{ count: number }>
  }
  user: { update: AsyncMock<unknown> }
  $transaction: jest.MockedFunction<
    (
      callback: (tx: TransactionMock) => Promise<unknown>,
      options: TransactionOptions,
    ) => Promise<unknown>
  >
}

type SectionRow = {
  id: number
  section: string
  coordinatorId: number | null
  joinCodeId: number | null
  deletedAt: Date | null
}

type CoordinatorRow = {
  id: number
  deletedAt: Date | null
  faculty: {
    id: number
    deletedAt: Date | null
    user: { id: number; deletedAt: Date | null }
  }
}

type GlobalSectionRow = {
  id: number
  section: string
  academicYear: string
  coordinatorId: number | null
  capstone2OpenedAt: Date | null
  createdAt: Date
  students: { id: number; groupId: number | null }[]
  groups: { id: number }[]
  coordinator: {
    id: number
    deletedAt: Date | null
    faculty: {
      deletedAt: Date | null
      user: {
        id: number
        deletedAt: Date | null
        name: string
        email: string
        avatarGradient: string
      }
    }
  } | null
}

const SECTION_ID = 101
const SECTION_NAME = 'BSIS 4A'
const CURRENT_COORDINATOR_ID = 7
const NEXT_COORDINATOR_ID = 20
const JOIN_CODE_ID = 501
const STUDENT_USER_ID = 55
const INVITATION_CODE = 'ABC123'

const managerSession: Session = {
  expires: '2099-01-01T00:00:00.000Z',
  user: {
    id: '1',
    name: 'Section Manager',
    email: 'manager@example.com',
    role: 'ADMIN',
  },
}

const guestSession: Session = {
  expires: '2099-01-01T00:00:00.000Z',
  user: {
    id: String(STUDENT_USER_ID),
    name: 'Joining Student',
    email: 'student@example.com',
    role: 'GUEST',
  },
}

function sectionFixture(overrides: Partial<SectionRow> = {}): SectionRow {
  return {
    id: SECTION_ID,
    section: SECTION_NAME,
    coordinatorId: CURRENT_COORDINATOR_ID,
    joinCodeId: JOIN_CODE_ID,
    deletedAt: null,
    ...overrides,
  }
}

function coordinatorFixture(
  overrides: Partial<CoordinatorRow> = {},
): CoordinatorRow {
  return {
    id: NEXT_COORDINATOR_ID,
    deletedAt: null,
    faculty: {
      id: 300,
      deletedAt: null,
      user: { id: 200, deletedAt: null },
    },
    ...overrides,
  }
}

function globalSectionRow(
  overrides: Partial<GlobalSectionRow> = {},
): GlobalSectionRow {
  return {
    id: SECTION_ID,
    section: SECTION_NAME,
    academicYear: '2026-2027',
    coordinatorId: CURRENT_COORDINATOR_ID,
    capstone2OpenedAt: null,
    createdAt: new Date('2026-01-15T00:00:00.000Z'),
    students: [],
    groups: [],
    coordinator: {
      id: CURRENT_COORDINATOR_ID,
      deletedAt: null,
      faculty: {
        deletedAt: null,
        user: {
          id: 200,
          deletedAt: null,
          name: 'Current Coordinator',
          email: 'coordinator@example.com',
          avatarGradient: 'linear-gradient(135deg, #707dff, #5062f5)',
        },
      },
    },
    ...overrides,
  }
}

const txMock: TransactionMock = {
  $queryRaw: jest.fn(),
  section: { findFirst: jest.fn(), updateMany: jest.fn() },
  student: {
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  group: { count: jest.fn() },
  joinCode: { findFirst: jest.fn(), updateMany: jest.fn() },
  user: { update: jest.fn() },
}

const prismaMock = prisma as unknown as PrismaMock
const managerGuardMock = jest.mocked(requireGlobalSectionManager)
const sessionMock = jest.mocked(getServerSession)
const revalidateTagMock = jest.mocked(revalidateTag)
const updateTagMock = jest.mocked(updateTag)
const revalidateFeatureMock = jest.mocked(revalidateFeature)
const auditMock = jest.mocked(audit)

function expectNoSideEffects() {
  expect(auditMock).not.toHaveBeenCalled()
  expect(revalidateTagMock).not.toHaveBeenCalled()
  expect(updateTagMock).not.toHaveBeenCalled()
  expect(revalidateFeatureMock).not.toHaveBeenCalled()
}

function expectNoMutation() {
  expect(prismaMock.section.updateMany).not.toHaveBeenCalled()
  expect(txMock.section.updateMany).not.toHaveBeenCalled()
  expect(txMock.joinCode.updateMany).not.toHaveBeenCalled()
  expect(txMock.student.create).not.toHaveBeenCalled()
  expect(txMock.student.update).not.toHaveBeenCalled()
  expect(txMock.user.update).not.toHaveBeenCalled()
  expectNoSideEffects()
}

function expectSerializableTransaction() {
  expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 10_000,
  })
}

describe('section manager mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    managerGuardMock.mockReset().mockResolvedValue(managerSession)
    sessionMock.mockReset().mockResolvedValue(managerSession)
    revalidateTagMock.mockReset()
    updateTagMock.mockReset()
    revalidateFeatureMock.mockReset()
    auditMock.mockReset().mockResolvedValue(undefined)

    prismaMock.section.findMany.mockReset().mockResolvedValue([])
    prismaMock.section.findFirst
      .mockReset()
      .mockResolvedValue(sectionFixture())
    prismaMock.section.updateMany.mockReset().mockResolvedValue({ count: 1 })
    prismaMock.coordinator.findFirst
      .mockReset()
      .mockResolvedValue(coordinatorFixture())
    prismaMock.student.count.mockReset().mockResolvedValue(0)
    prismaMock.group.count.mockReset().mockResolvedValue(0)
    prismaMock.joinCode.findFirst.mockReset().mockResolvedValue({
      id: JOIN_CODE_ID,
      section: { id: SECTION_ID },
    })
    prismaMock.joinCode.updateMany.mockReset().mockResolvedValue({ count: 1 })
    prismaMock.user.update.mockReset().mockResolvedValue({ id: STUDENT_USER_ID })

    txMock.$queryRaw.mockReset().mockResolvedValue([{ id: SECTION_ID }])
    txMock.section.findFirst.mockReset().mockResolvedValue(sectionFixture())
    txMock.section.updateMany.mockReset().mockResolvedValue({ count: 1 })
    txMock.student.count.mockReset().mockResolvedValue(0)
    txMock.student.findFirst.mockReset().mockResolvedValue(null)
    txMock.student.create.mockReset().mockResolvedValue({ id: 900 })
    txMock.student.update.mockReset().mockResolvedValue({ id: 900 })
    txMock.group.count.mockReset().mockResolvedValue(0)
    txMock.joinCode.findFirst.mockReset().mockResolvedValue({ id: JOIN_CODE_ID })
    txMock.joinCode.updateMany.mockReset().mockResolvedValue({ count: 1 })
    txMock.user.update.mockReset().mockResolvedValue({ id: STUDENT_USER_ID })

    prismaMock.$transaction.mockReset().mockImplementation(async (callback) =>
      callback(txMock),
    )
  })

  describe('getSections coordinator identity', () => {
    test('keeps a genuinely unassigned section unassigned', async () => {
      prismaMock.section.findMany.mockResolvedValue([
        globalSectionRow({ coordinatorId: null, coordinator: null }),
      ])

      const result = await getSections()

      expect(result).toEqual({
        success: true,
        payload: [
          expect.objectContaining({ coordinatorId: null, coordinator: null }),
        ],
      })
    })

    test('preserves a live coordinator id with its display profile', async () => {
      prismaMock.section.findMany.mockResolvedValue([globalSectionRow()])

      const result = await getSections()

      expect(result).toEqual({
        success: true,
        payload: [
          expect.objectContaining({
            coordinatorId: CURRENT_COORDINATOR_ID,
            coordinator: expect.objectContaining({
              id: CURRENT_COORDINATOR_ID,
              name: 'Current Coordinator',
            }),
          }),
        ],
      })
    })

    test('preserves an assigned id when the display chain is inactive', async () => {
      prismaMock.section.findMany.mockResolvedValue([
        globalSectionRow({
          coordinator: {
            id: CURRENT_COORDINATOR_ID,
            deletedAt: null,
            faculty: {
              deletedAt: null,
              user: {
                id: 200,
                deletedAt: new Date('2026-01-01T00:00:00.000Z'),
                name: 'Inactive Coordinator',
                email: 'inactive@example.com',
                avatarGradient: 'linear-gradient(135deg, #ccc, #999)',
              },
            },
          },
        }),
      ])

      const result = await getSections()

      expect(result).toEqual({
        success: true,
        payload: [
          expect.objectContaining({
            coordinatorId: CURRENT_COORDINATOR_ID,
            coordinator: null,
          }),
        ],
      })
    })
  })

  describe('reassignSectionCoordinator', () => {
    test('denies an unauthorized caller without writing', async () => {
      managerGuardMock.mockResolvedValue(null)

      const result = await reassignSectionCoordinator(
        SECTION_ID,
        NEXT_COORDINATOR_ID,
        CURRENT_COORDINATOR_ID,
      )

      expect(result).toBe(sectionUnauthorized)
      expect(prismaMock.section.findFirst).not.toHaveBeenCalled()
      expectNoMutation()
    })

    test.each([
      [1.5, NEXT_COORDINATOR_ID, CURRENT_COORDINATOR_ID, 'Invalid section.'],
      [SECTION_ID, 20.5, CURRENT_COORDINATOR_ID, 'Invalid coordinator.'],
      [
        SECTION_ID,
        NEXT_COORDINATOR_ID,
        Number.NaN,
        'Invalid expected coordinator.',
      ],
    ])(
      'rejects invalid ids before reading the database',
      async (sectionId, coordinatorId, expectedId, message) => {
        const result = await reassignSectionCoordinator(
          sectionId,
          coordinatorId,
          expectedId,
        )

        expect(result).toEqual({ success: false, message })
        expect(prismaMock.section.findFirst).not.toHaveBeenCalled()
        expectNoMutation()
      },
    )

    test('refuses an unassigned section', async () => {
      prismaMock.section.findFirst.mockResolvedValue(
        sectionFixture({ coordinatorId: null }),
      )

      const result = await reassignSectionCoordinator(
        SECTION_ID,
        NEXT_COORDINATOR_ID,
        CURRENT_COORDINATOR_ID,
      )

      expect(result).toEqual({
        success: false,
        message: 'This section is unassigned and cannot be reassigned.',
      })
      expectNoMutation()
    })

    test('refuses a stale expected coordinator', async () => {
      const result = await reassignSectionCoordinator(
        SECTION_ID,
        NEXT_COORDINATOR_ID,
        CURRENT_COORDINATOR_ID - 1,
      )

      expect(result).toEqual({
        success: false,
        message:
          'This section changed since it was loaded. Refresh and try again.',
      })
      expectNoMutation()
    })

    test('refuses the same coordinator', async () => {
      prismaMock.coordinator.findFirst.mockResolvedValue(
        coordinatorFixture({ id: CURRENT_COORDINATOR_ID }),
      )

      const result = await reassignSectionCoordinator(
        SECTION_ID,
        CURRENT_COORDINATOR_ID,
        CURRENT_COORDINATOR_ID,
      )

      expect(result).toEqual({
        success: false,
        message: 'Choose a different coordinator.',
      })
      expectNoMutation()
    })

    test('refuses an inactive target coordinator', async () => {
      prismaMock.coordinator.findFirst.mockResolvedValue(
        coordinatorFixture({ deletedAt: new Date('2026-01-01T00:00:00.000Z') }),
      )

      const result = await reassignSectionCoordinator(
        SECTION_ID,
        NEXT_COORDINATOR_ID,
        CURRENT_COORDINATOR_ID,
      )

      expect(result).toEqual({
        success: false,
        message: 'Coordinator not found or inactive.',
      })
      expectNoMutation()
    })

    test('reassigns with an atomic expected-owner guard and immediate invalidation', async () => {
      const result = await reassignSectionCoordinator(
        SECTION_ID,
        NEXT_COORDINATOR_ID,
        CURRENT_COORDINATOR_ID,
      )

      expect(prismaMock.section.updateMany).toHaveBeenCalledWith({
        where: {
          id: SECTION_ID,
          deletedAt: null,
          coordinatorId: CURRENT_COORDINATOR_ID,
        },
        data: { coordinatorId: NEXT_COORDINATOR_ID },
      })
      expect(auditMock).toHaveBeenCalledWith({
        action: 'SECTION_COORDINATOR_REASSIGN',
        entity: 'SECTION',
        entityId: String(SECTION_ID),
        entityName: SECTION_NAME,
        before: { coordinatorId: CURRENT_COORDINATOR_ID },
        after: { coordinatorId: NEXT_COORDINATOR_ID },
      })
      expect(updateTagMock).toHaveBeenCalledWith('sections')
      expect(updateTagMock).toHaveBeenCalledWith('my-sections')
      expect(updateTagMock).toHaveBeenCalledWith('join-code')
      expect(updateTagMock).toHaveBeenCalledWith(`my-section-${SECTION_ID}`)
      expect(updateTagMock).toHaveBeenCalledWith('coordinators')
      expect(updateTagMock).toHaveBeenCalledWith('faculty')
      expect(revalidateFeatureMock).toHaveBeenCalledWith('sections')
      expect(revalidateFeatureMock).toHaveBeenCalledWith('faculties')
      expect(result).toEqual({
        success: true,
        message: 'Coordinator reassigned for BSIS 4A successfully.',
        payload: {
          sectionId: SECTION_ID,
          coordinatorId: NEXT_COORDINATOR_ID,
        },
      })
    })

    test('returns a conflict when the guarded update affects zero rows', async () => {
      prismaMock.section.updateMany.mockResolvedValue({ count: 0 })

      const result = await reassignSectionCoordinator(
        SECTION_ID,
        NEXT_COORDINATOR_ID,
        CURRENT_COORDINATOR_ID,
      )

      expect(result).toEqual({
        success: false,
        message:
          'This section changed since it was loaded. Refresh and try again.',
      })
      expect(auditMock).not.toHaveBeenCalled()
      expect(updateTagMock).not.toHaveBeenCalled()
    })
  })

  describe('archiveSection', () => {
    test('denies an unauthorized caller before starting a transaction', async () => {
      managerGuardMock.mockResolvedValue(null)

      const result = await archiveSection(SECTION_ID)

      expect(result).toBe(sectionUnauthorized)
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
      expectNoSideEffects()
    })

    test('refuses a section that cannot be locked', async () => {
      txMock.$queryRaw.mockResolvedValue([])

      const result = await archiveSection(SECTION_ID)

      expect(result).toEqual({ success: false, message: 'Section not found.' })
      expect(txMock.section.updateMany).not.toHaveBeenCalled()
      expectNoSideEffects()
    })

    test('refuses a section that is no longer live after the lock', async () => {
      txMock.section.findFirst.mockResolvedValue(null)

      const result = await archiveSection(SECTION_ID)

      expect(result).toEqual({ success: false, message: 'Section not found.' })
      expectNoMutation()
    })

    test.each([
      [1, 0],
      [0, 1],
    ])(
      'rolls back when the section has active students or groups',
      async (studentCount, groupCount) => {
        txMock.student.count.mockResolvedValue(studentCount)
        txMock.group.count.mockResolvedValue(groupCount)

        const result = await archiveSection(SECTION_ID)

        expect(result).toEqual({
          success: false,
          message:
            'Only empty sections can be archived. Move or remove students and groups first.',
        })
        expectSerializableTransaction()
        expect(txMock.joinCode.updateMany).not.toHaveBeenCalled()
        expect(txMock.section.updateMany).not.toHaveBeenCalled()
        expectNoSideEffects()
      },
    )

    test('archives the section and join code in one locked transaction', async () => {
      const result = await archiveSection(SECTION_ID)

      expectSerializableTransaction()
      expect(txMock.$queryRaw).toHaveBeenCalledWith(
        expect.any(Array),
        SECTION_ID,
      )
      expect(txMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        txMock.section.findFirst.mock.invocationCallOrder[0],
      )

      const joinCodeWrite = txMock.joinCode.updateMany.mock.calls[0][0] as {
        where: { id: number; deletedAt: null }
        data: { deletedAt: Date }
      }
      const sectionWrite = txMock.section.updateMany.mock.calls[0][0] as {
        where: { id: number; deletedAt: null }
        data: { deletedAt: Date }
      }
      expect(joinCodeWrite.where).toEqual({
        id: JOIN_CODE_ID,
        deletedAt: null,
      })
      expect(sectionWrite.where).toEqual({ id: SECTION_ID, deletedAt: null })
      expect(joinCodeWrite.data.deletedAt).toEqual(sectionWrite.data.deletedAt)
      expect(auditMock).toHaveBeenCalledWith({
        action: 'SECTION_ARCHIVE',
        entity: 'SECTION',
        entityId: String(SECTION_ID),
        entityName: SECTION_NAME,
        before: { section: SECTION_NAME, deletedAt: null },
        after: {
          section: SECTION_NAME,
          deletedAt: sectionWrite.data.deletedAt.toISOString(),
        },
      })
      expect(updateTagMock).toHaveBeenCalledWith('sections')
      expect(updateTagMock).toHaveBeenCalledWith('faculty')
      expect(updateTagMock).toHaveBeenCalledWith('coordinators')
      expect(revalidateFeatureMock).toHaveBeenCalledWith('sections')
      expect(revalidateFeatureMock).toHaveBeenCalledWith('faculties')
      expect(result).toEqual({
        success: true,
        message: 'Section BSIS 4A archived.',
      })
    })

    test('rolls back when the guarded section update affects zero rows', async () => {
      txMock.section.updateMany.mockResolvedValue({ count: 0 })

      const result = await archiveSection(SECTION_ID)

      expect(result).toEqual({
        success: false,
        message:
          'This section changed since it was loaded. Refresh and try again.',
      })
      expectNoSideEffects()
    })

    test('retries P2034 and runs audit once after the successful commit', async () => {
      let attempt = 0
      prismaMock.$transaction.mockImplementation(async (callback) => {
        attempt += 1
        const result = await callback(txMock)
        if (attempt === 1) throw { code: 'P2034' }
        return result
      })

      const result = await archiveSection(SECTION_ID)

      expect(result.success).toBe(true)
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(2)
      expect(txMock.$queryRaw).toHaveBeenCalledTimes(2)
      expect(auditMock).toHaveBeenCalledTimes(1)
      expect(updateTagMock).toHaveBeenCalledTimes(6)
    })

    test('returns a conflict after P2034 retries are exhausted', async () => {
      prismaMock.$transaction.mockRejectedValue({ code: 'P2034' })

      const result = await archiveSection(SECTION_ID)

      expect(result).toEqual({
        success: false,
        message:
          'This section changed since it was loaded. Refresh and try again.',
      })
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(4)
      expectNoSideEffects()
    })
  })

  describe('softDeleteSection compatibility wrapper', () => {
    test.each(['101abc', '1.5', '', ' '])(
      'rejects the non-integer id %p without starting a transaction',
      async (id) => {
        const result = await softDeleteSection(id)

        expect(result).toEqual({
          success: false,
          payload: null,
          message: 'Invalid section id.',
        })
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
      },
    )

    test('delegates a valid id through the archive transaction', async () => {
      const result = await softDeleteSection(String(SECTION_ID))

      expectSerializableTransaction()
      expect(result).toEqual({
        success: true,
        message: 'Section BSIS 4A archived.',
      })
    })
  })

  describe('joinSectionWithCode', () => {
    beforeEach(() => {
      sessionMock.mockResolvedValue(guestSession)
    })

    test('denies an unauthenticated caller before reading a code', async () => {
      sessionMock.mockResolvedValue(null)

      const result = await joinSectionWithCode(INVITATION_CODE)

      expect(result).toEqual({
        success: false,
        message: 'Not authenticated',
      })
      expect(prismaMock.joinCode.findFirst).not.toHaveBeenCalled()
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    test('rejects an invalid code before starting a transaction', async () => {
      prismaMock.joinCode.findFirst.mockResolvedValue(null)

      const result = await joinSectionWithCode(INVITATION_CODE)

      expect(result).toEqual({
        success: false,
        message: 'Invalid or expired invitation code.',
      })
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
      expectNoSideEffects()
    })

    test('creates the student and role update under the section lock', async () => {
      const result = await joinSectionWithCode(' abc123 ')

      expectSerializableTransaction()
      expect(txMock.$queryRaw).toHaveBeenCalledWith(
        expect.any(Array),
        SECTION_ID,
      )
      expect(txMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        txMock.section.findFirst.mock.invocationCallOrder[0],
      )
      expect(txMock.student.create).toHaveBeenCalledWith({
        data: { userId: STUDENT_USER_ID, sectionId: SECTION_ID },
      })
      expect(txMock.user.update).toHaveBeenCalledWith({
        where: { id: STUDENT_USER_ID, deletedAt: null },
        data: { role: 'STUDENT' },
      })
      expect(auditMock).toHaveBeenCalledWith({
        action: 'GROUP_JOIN',
        entity: 'SECTION',
        entityId: String(SECTION_ID),
        entityName: SECTION_NAME,
        before: null,
        after: {
          userId: STUDENT_USER_ID,
          sectionId: SECTION_ID,
          section: SECTION_NAME,
        },
      })
      expect(updateTagMock).toHaveBeenCalledWith('users')
      expect(updateTagMock).toHaveBeenCalledWith('sections')
      expect(updateTagMock).toHaveBeenCalledWith('my-sections')
      expect(updateTagMock).toHaveBeenCalledWith(`my-section-${SECTION_ID}`)
      expect(result).toEqual({
        success: true,
        message: 'Successfully joined the section.',
      })
    })

    test('refuses a section archived before the lock was acquired', async () => {
      txMock.section.findFirst.mockResolvedValue(null)

      const result = await joinSectionWithCode(INVITATION_CODE)

      expect(result).toEqual({
        success: false,
        message: 'No section is linked to this code.',
      })
      expect(txMock.student.create).not.toHaveBeenCalled()
      expect(txMock.user.update).not.toHaveBeenCalled()
      expectNoSideEffects()
    })

    test('refuses a code invalidated before the lock was acquired', async () => {
      txMock.joinCode.findFirst.mockResolvedValue(null)

      const result = await joinSectionWithCode(INVITATION_CODE)

      expect(result).toEqual({
        success: false,
        message: 'Invalid or expired invitation code.',
      })
      expect(txMock.student.create).not.toHaveBeenCalled()
      expectNoSideEffects()
    })

    test('refuses a user who is already enrolled', async () => {
      txMock.student.findFirst.mockResolvedValue({
        id: 900,
        deletedAt: null,
      })

      const result = await joinSectionWithCode(INVITATION_CODE)

      expect(result).toEqual({
        success: false,
        message: 'You are already enrolled in a section.',
      })
      expect(txMock.student.create).not.toHaveBeenCalled()
      expect(txMock.student.update).not.toHaveBeenCalled()
      expect(txMock.user.update).not.toHaveBeenCalled()
      expectNoSideEffects()
    })

    test('resurrects a soft-deleted student inside the same transaction', async () => {
      txMock.student.findFirst.mockResolvedValue({
        id: 900,
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      })

      const result = await joinSectionWithCode(INVITATION_CODE)

      expect(txMock.student.update).toHaveBeenCalledWith({
        where: { id: 900 },
        data: {
          sectionId: SECTION_ID,
          groupId: null,
          deletedAt: null,
        },
      })
      expect(txMock.student.create).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
    })
  })
})
