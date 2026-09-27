import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/actions/guard'
import {
  favoriteArchive,
  unfavoriteArchive,
  getMyFavoriteArchiveIds,
} from './repository'

/**
 * Covers the per-user favorites actions only. The publish/update/remove
 * archive mutations are exercised through the blob route tests and manual
 * verification; this file stays scoped to the favorite/unfavorite contract.
 */

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    capstoneArchive: { findFirst: jest.fn() },
    capstoneArchiveFavorite: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/actions/guard', () => ({
  __esModule: true,
  getSession: jest.fn(),
  requireAdmin: jest.fn(),
  unauthorized: {
    success: false,
    payload: null,
    message: 'You are not authorized to perform this action.',
  },
}))

jest.mock('@/lib/actions/revalidate', () => ({
  revalidateFeature: jest.fn(),
}))

jest.mock('@/lib/actions/audit', () => ({
  audit: jest.fn(),
}))

type LooseMock = {
  mockResolvedValue: (v: unknown) => void
  mockRejectedValue: (v: unknown) => void
  mock: { calls: unknown[] }
}
const asMock = (m: unknown): LooseMock => m as LooseMock

const prismaMock = {
  archive: asMock(prisma.capstoneArchive.findFirst),
  favorite: {
    findMany: asMock(prisma.capstoneArchiveFavorite.findMany),
    upsert: asMock(prisma.capstoneArchiveFavorite.upsert),
    deleteMany: asMock(prisma.capstoneArchiveFavorite.deleteMany),
  },
}
const sessionMock = asMock(getSession)

function signedIn(userId = 7, role = 'STUDENT') {
  sessionMock.mockResolvedValue({ user: { id: String(userId), role } })
}

beforeEach(() => {
  prismaMock.archive.mockResolvedValue({ id: 3 })
  prismaMock.favorite.findMany.mockResolvedValue([])
  prismaMock.favorite.upsert.mockResolvedValue({ id: 1 })
  prismaMock.favorite.deleteMany.mockResolvedValue({ count: 1 })
})

describe('getMyFavoriteArchiveIds', () => {
  test('returns null for a signed-out caller so the UI can stay unstarred', async () => {
    sessionMock.mockResolvedValue(null)
    await expect(getMyFavoriteArchiveIds()).resolves.toBeNull()
  })

  test('returns null when the session id is not numeric', async () => {
    sessionMock.mockResolvedValue({ user: { id: 'not-a-number' } })
    await expect(getMyFavoriteArchiveIds()).resolves.toBeNull()
  })

  test('maps the rows to archive IDs', async () => {
    signedIn(7)
    prismaMock.favorite.findMany.mockResolvedValue([
      { archiveId: 9 },
      { archiveId: 4 },
    ])
    await expect(getMyFavoriteArchiveIds()).resolves.toEqual([9, 4])
  })

  // Favorites are per-user and must never be served from the shared
  // 'use cache' archive read, so the query is scoped by userId here.
  test('scopes the query to the caller and excludes soft-deleted archives', async () => {
    signedIn(42)
    await getMyFavoriteArchiveIds()
    expect(prismaMock.favorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 42, archive: { deletedAt: null } },
      }),
    )
  })

  test('degrades to an empty set instead of throwing', async () => {
    signedIn(7)
    prismaMock.favorite.findMany.mockRejectedValue(new Error('db down'))
    await expect(getMyFavoriteArchiveIds()).resolves.toEqual([])
  })
})

describe('favoriteArchive', () => {
  test('refuses an unauthenticated caller without writing', async () => {
    sessionMock.mockResolvedValue(null)
    const res = await favoriteArchive(3)
    expect(res.success).toBe(false)
    expect(prismaMock.favorite.upsert).not.toHaveBeenCalled()
  })

  test('rejects a non-integer id', async () => {
    signedIn(7)
    const res = await favoriteArchive(1.5)
    expect(res.success).toBe(false)
    expect(prismaMock.favorite.upsert).not.toHaveBeenCalled()
  })

  test('refuses an unknown or soft-deleted archive', async () => {
    signedIn(7)
    prismaMock.archive.mockResolvedValue(null)
    const res = await favoriteArchive(999)
    expect(res.success).toBe(false)
    expect(prismaMock.favorite.upsert).not.toHaveBeenCalled()
  })

  // Idempotency comes from the upsert + the composite unique constraint, so a
  // double-click can never produce two rows.
  test('upserts on the composite unique key with a no-op update', async () => {
    signedIn(7)
    const res = await favoriteArchive(3)
    expect(res.success).toBe(true)
    expect(prismaMock.favorite.upsert).toHaveBeenCalledWith({
      where: { userId_archiveId: { userId: 7, archiveId: 3 } },
      create: { userId: 7, archiveId: 3 },
      update: {},
    })
  })

  test('is idempotent across a repeat call', async () => {
    signedIn(7)
    await favoriteArchive(3)
    await favoriteArchive(3)
    expect(prismaMock.favorite.upsert).toHaveBeenCalledTimes(2)
    // Both calls target the identical composite key, so the DB's unique
    // constraint collapses the second into a no-op rather than a duplicate row.
    expect(prismaMock.favorite.upsert).toHaveBeenNthCalledWith(2, {
      where: { userId_archiveId: { userId: 7, archiveId: 3 } },
      create: { userId: 7, archiveId: 3 },
      update: {},
    })
  })

  test('reports failure without throwing when the write fails', async () => {
    signedIn(7)
    prismaMock.favorite.upsert.mockRejectedValue(new Error('constraint'))
    const res = await favoriteArchive(3)
    expect(res.success).toBe(false)
  })
})

describe('unfavoriteArchive', () => {
  test('refuses an unauthenticated caller without writing', async () => {
    sessionMock.mockResolvedValue(null)
    const res = await unfavoriteArchive(3)
    expect(res.success).toBe(false)
    expect(prismaMock.favorite.deleteMany).not.toHaveBeenCalled()
  })

  // deleteMany rather than delete: removing something already absent is a
  // no-op success, not a thrown "record not found".
  test('deletes by user and archive without requiring an existing row', async () => {
    signedIn(7)
    const res = await unfavoriteArchive(3)
    expect(res.success).toBe(true)
    expect(prismaMock.favorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7, archiveId: 3 },
    })
  })

  test('still succeeds when nothing matched', async () => {
    signedIn(7)
    prismaMock.favorite.deleteMany.mockResolvedValue({ count: 0 })
    const res = await unfavoriteArchive(3)
    expect(res.success).toBe(true)
  })

  test('refuses an unknown or soft-deleted archive', async () => {
    signedIn(7)
    prismaMock.archive.mockResolvedValue(null)
    const res = await unfavoriteArchive(999)
    expect(res.success).toBe(false)
    expect(prismaMock.favorite.deleteMany).not.toHaveBeenCalled()
  })

  test('reports failure without throwing when the write fails', async () => {
    signedIn(7)
    prismaMock.favorite.deleteMany.mockRejectedValue(new Error('db down'))
    const res = await unfavoriteArchive(3)
    expect(res.success).toBe(false)
  })
})
