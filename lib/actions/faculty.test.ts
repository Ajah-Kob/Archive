import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { Session } from 'next-auth'
import prisma from '@/lib/prisma'
import {
  requireAdmin,
  requireAdminOrProgramChair,
  unauthorized,
} from '@/lib/actions/guard'
import { revalidateTag } from 'next/cache'
import { revalidateFeature } from '@/lib/actions/revalidate'
import { getAvailableFaculty } from './faculty'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    faculty: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    adviser: { findFirst: jest.fn() },
    user: { findFirst: jest.fn(), update: jest.fn() },
    coordinator: { update: jest.fn() },
  },
}))

// Guard is mocked at the module boundary so these tests assert the action's
// own authorization contract, not the DB-backed guard implementation.
jest.mock('@/lib/actions/guard', () => ({
  getSession: jest.fn(),
  requireAdmin: jest.fn(),
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
  revalidatePath: jest.fn(),
}))

jest.mock('@/lib/actions/revalidate', () => ({
  revalidateFeature: jest.fn(),
}))

jest.mock('@/lib/actions/audit', () => ({
  audit: jest.fn(),
}))

jest.mock('@/lib/actions/join-code', () => ({
  validateFacultyCode: jest.fn(),
}))

type WhereClause = Record<string, unknown>

type FindManyArgs = {
  where: WhereClause
  include?: Record<string, unknown>
  select?: Record<string, unknown>
  orderBy?: Record<string, unknown>
}

type FindFirstArgs = { where: WhereClause }

type PrismaMock = {
  faculty: {
    findMany: jest.MockedFunction<(args: FindManyArgs) => Promise<unknown[]>>
    findFirst: jest.MockedFunction<(args: FindFirstArgs) => Promise<unknown>>
    create: jest.MockedFunction<(args: { data: WhereClause }) => Promise<unknown>>
    update: jest.MockedFunction<
      (args: { where: WhereClause; data: WhereClause }) => Promise<unknown>
    >
    updateMany: jest.MockedFunction<
      (args: WhereClause) => Promise<{ count: number }>
    >
  }
}

type AvailableFacultyRow = {
  id: number
  userId: number
  isProgramChair: boolean
  coordinator: { id: number; deletedAt: Date | null } | null
  adviser: { id: number; deletedAt: Date | null } | null
  user: {
    id: number
    name: string
    email: string
    image: string | null
    avatarGradient: string
  }
}

const CHAIR_FACULTY_ID = 300
const CHAIR_USER_ID = 900
const OTHER_FACULTY_ID = 301
const OTHER_USER_ID = 901

const chairSession: Session = {
  expires: '2099-01-01T00:00:00.000Z',
  user: {
    id: String(CHAIR_USER_ID),
    name: 'Program Chair',
    email: 'chair@example.com',
    role: 'FACULTY',
    isProgramChair: true,
  },
}

const adminSession: Session = {
  expires: '2099-01-01T00:00:00.000Z',
  user: {
    id: '1',
    name: 'Admin',
    email: 'admin@example.com',
    role: 'ADMIN',
  },
}

// A non-chair faculty session. Not granted access by the actions themselves —
// `requireAdminOrProgramChair` is the contract boundary and resolves to null
// for this role, which is the denial the authorization tests below exercise.
const nonChairFacultySession: Session = {
  expires: '2099-01-01T00:00:00.000Z',
  user: {
    id: '905',
    name: 'Plain Faculty',
    email: 'faculty@example.com',
    role: 'FACULTY',
    isProgramChair: false,
  },
}

function availableFacultyRow(
  overrides: Partial<AvailableFacultyRow> = {},
): AvailableFacultyRow {
  return {
    id: OTHER_FACULTY_ID,
    userId: OTHER_USER_ID,
    isProgramChair: false,
    // Soft-deleted Coordinator record — the row is still an invite candidate.
    coordinator: { id: 55, deletedAt: new Date('2026-01-01T00:00:00.000Z') },
    adviser: null,
    user: {
      id: OTHER_USER_ID,
      name: 'Eligible Faculty',
      email: 'eligible@example.com',
      image: null,
      avatarGradient: 'from-sky-400 to-blue-600',
    },
    ...overrides,
  }
}

const chairRow = availableFacultyRow({
  id: CHAIR_FACULTY_ID,
  userId: CHAIR_USER_ID,
  isProgramChair: true,
  coordinator: null,
  user: {
    id: CHAIR_USER_ID,
    name: 'Program Chair',
    email: 'chair@example.com',
    image: null,
    avatarGradient: 'from-amber-400 to-orange-600',
  },
})

const prismaMock = prisma as unknown as PrismaMock
const guardMock = jest.mocked(requireAdminOrProgramChair)
const adminGuardMock = jest.mocked(requireAdmin)
const revalidateTagMock = jest.mocked(revalidateTag)
const revalidateFeatureMock = jest.mocked(revalidateFeature)

/** The `where` clause Prisma was actually called with, or a sentinel. */
function facultyWhere(): WhereClause {
  const call = prismaMock.faculty.findMany.mock.calls[0]
  return call ? call[0].where : { __neverCalled: true }
}

function expectNoReads() {
  expect(prismaMock.faculty.findMany).not.toHaveBeenCalled()
  expect(prismaMock.faculty.findFirst).not.toHaveBeenCalled()
}

/** A read must not invalidate any cache tag or feature path. */
function expectNoRevalidation() {
  expect(revalidateTagMock).not.toHaveBeenCalled()
  expect(revalidateFeatureMock).not.toHaveBeenCalled()
}

/**
 * Mirrors `requireAdminOrProgramChair`: an admin, the chair, or a live session
 * resolves; everyone else (including a non-chair faculty) resolves to null.
 * Modelling it here keeps the role decision at the guard boundary instead of
 * pretending the action re-checks roles.
 */
function resolveGuardFor(session: Session | null): Session | null {
  if (!session) return null
  const role = session.user.role ?? ''
  if (role === 'ADMIN' || role === 'SUPERADMIN') return session
  return session.user.isProgramChair ? session : null
}

describe('lib/actions/faculty — getAvailableFaculty (Add Coordinator drawer)', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Deny by default; every test opts into the role it is exercising.
    guardMock.mockReset().mockResolvedValue(null)
    adminGuardMock.mockReset().mockResolvedValue(null)
    revalidateTagMock.mockReset()
    revalidateFeatureMock.mockReset()

    prismaMock.faculty.findMany.mockReset().mockResolvedValue([chairRow])
    prismaMock.faculty.findFirst.mockReset().mockResolvedValue(null)
  })

  // Objective: non-admin / non-chair callers are denied BEFORE any database
  // access, so an unauthorized session cannot enumerate the faculty roster.
  // `requireAdminOrProgramChair` is the contract boundary: it resolves to null
  // for anyone who is neither an admin nor the chair.
  describe('authorization', () => {
    test.each([
      ['an unauthenticated caller', null],
      ['a non-chair faculty session', nonChairFacultySession],
    ] as [string, Session | null][])(
      'denies %s without querying Prisma',
      async (_label, session) => {
        // Arrange
        guardMock.mockResolvedValue(resolveGuardFor(session))

        // Act
        const result = await getAvailableFaculty()

        // Assert
        expect(result).toBe(unauthorized)
        expectNoReads()
        expectNoRevalidation()
      },
    )

    test('delegates to the chair-aware guard rather than the admin-only guard', async () => {
      // Arrange
      guardMock.mockResolvedValue(chairSession)

      // Act
      await getAvailableFaculty()

      // Assert — chair access depends on requireAdminOrProgramChair; using the
      // admin-only guard would lock chairs out of the drawer.
      expect(guardMock).toHaveBeenCalledTimes(1)
      expect(adminGuardMock).not.toHaveBeenCalled()
    })

    test('denies a malformed session with an empty user id without querying Prisma', async () => {
      // Arrange — a session object that exists but carries no usable id.
      guardMock.mockResolvedValue({
        expires: '2099-01-01T00:00:00.000Z',
        user: { id: '', name: 'Broken', email: 'broken@example.com', role: 'FACULTY' },
      })

      // Act
      const result = await getAvailableFaculty()

      // Assert
      expect(result).toBe(unauthorized)
      expectNoReads()
      expectNoRevalidation()
    })
  })

  // Objective: the program chair is now an eligible invite target. The query
  // must keep the soft-delete filter and the active-Coordinator exclusion, and
  // must NOT filter program chairs out again.
  describe('program chair eligibility', () => {
    test.each([
      ['a program chair', chairSession],
      ['an admin', adminSession],
    ] as [string, Session][])(
      'queries with only the soft-delete and active-Coordinator filters for %s',
      async (_label, session) => {
        // Arrange
        guardMock.mockResolvedValue(session)
        prismaMock.faculty.findMany.mockResolvedValue([chairRow])

        // Act
        await getAvailableFaculty()

        // Assert — exact key set proves nothing else (notably no
        // `isProgramChair: false`) narrows the candidate roster.
        const where = facultyWhere()
        expect(Object.keys(where).sort()).toEqual(['coordinator', 'deletedAt'])
        expect(where).toEqual({
          deletedAt: null,
          coordinator: { isNot: { deletedAt: null } },
        })
        expect(where).not.toHaveProperty('isProgramChair')
        expect(JSON.stringify(where)).not.toContain('isProgramChair')
        expectNoRevalidation()
      },
    )

    test('does not restrict the selected columns so isProgramChair reaches the drawer', async () => {
      // Arrange
      guardMock.mockResolvedValue(chairSession)
      prismaMock.faculty.findMany.mockResolvedValue([chairRow])

      // Act
      await getAvailableFaculty()

      // Assert — an `include` (not a `select`) returns every Faculty scalar,
      // which is what keeps `isProgramChair` on the payload.
      const call = prismaMock.faculty.findMany.mock.calls[0]
      expect(call[0].select).toBeUndefined()
      expect(call[0].include).toEqual({
        user: {
          select: { id: true, name: true, email: true, image: true, avatarGradient: true },
        },
      })
      expect(call[0].orderBy).toEqual({ id: 'asc' })
    })

    test('returns the program chair in the payload with isProgramChair preserved', async () => {
      // Arrange
      const otherRow = availableFacultyRow()
      guardMock.mockResolvedValue(chairSession)
      prismaMock.faculty.findMany.mockResolvedValue([chairRow, otherRow])

      // Act
      const result = await getAvailableFaculty()

      // Assert — the chair is neither dropped nor flagged as ineligible.
      expect(result).toEqual({ success: true, payload: [chairRow, otherRow] })
      expect(result.payload).toHaveLength(2)
      expect(result.payload[0].isProgramChair).toBe(true)
      expect(result.payload[1].isProgramChair).toBe(false)
      expectNoRevalidation()
    })

    test('returns an empty payload when no faculty are eligible', async () => {
      // Arrange
      guardMock.mockResolvedValue(chairSession)
      prismaMock.faculty.findMany.mockResolvedValue([])

      // Act
      const result = await getAvailableFaculty()

      // Assert
      expect(result).toEqual({ success: true, payload: [] })
    })
  })

  describe('failure handling', () => {
    test('returns a failure payload when the faculty query throws', async () => {
      // Arrange
      guardMock.mockResolvedValue(chairSession)
      prismaMock.faculty.findMany.mockRejectedValue(new Error('db down'))

      // Act
      const result = await getAvailableFaculty()

      // Assert
      expect(result).toEqual({
        success: false,
        payload: null,
        message: 'Failed to get available faculty',
      })
      expectNoRevalidation()
    })
  })
})
