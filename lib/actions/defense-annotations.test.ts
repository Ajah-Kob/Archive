import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import prisma from '@/lib/prisma'
import { requirePanelist } from '@/lib/actions/guard'
import { getDefenseAnnotations } from './defense-annotations'

/**
 * The `status` in this payload is the CALLER'S OWN annotation row status, and
 * it drives the workspace's isCommitted flag — which decides whether the
 * document renders editable or as the read-only finalized view. Getting the
 * no-row case wrong there locks panelists out of a document they have not
 * touched yet, so it is pinned here.
 */

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    defenseSubmission: { findFirst: jest.fn() },
    defenseSubmissionAnnotation: { findMany: jest.fn(), upsert: jest.fn() },
  },
}))

jest.mock('@/lib/actions/guard', () => ({
  __esModule: true,
  requirePanelist: jest.fn(),
  unauthorized: { success: false, payload: null, message: 'Unauthorized' },
}))

jest.mock('next/cache', () => ({
  __esModule: true,
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
  revalidateTag: jest.fn(),
}))

type LooseMock = {
  mockResolvedValue: (v: unknown) => void
  mockReturnValue: (v: unknown) => void
}
const asMock = (m: unknown): LooseMock => m as LooseMock

const prismaMock = {
  submission: asMock(prisma.defenseSubmission.findFirst),
  annotation: asMock(prisma.defenseSubmissionAnnotation.findMany),
}
const panelistMock = asMock(requirePanelist)

// A minimal annotation item; the dedupe/visibility helpers only read these.
const item = (id: string, authorId: number) => ({
  id,
  annotation: { pageIndex: 0 },
  __author: authorId,
})

beforeEach(() => {
  panelistMock.mockResolvedValue({ user: { id: '4' } })
  prismaMock.submission.mockResolvedValue({ id: 6 })
})

describe('getDefenseAnnotations — own-row status', () => {
  test('reports DRAFT when the caller has an own draft row', async () => {
    prismaMock.annotation.mockResolvedValue([
      { data: [item('a', 4)], status: 'DRAFT', authorId: 4 },
    ])

    const res = await getDefenseAnnotations(6)

    expect(res.success).toBe(true)
    expect(res.payload?.status).toBe('DRAFT')
  })

  test('reports COMMITTED when the caller has an own committed row', async () => {
    prismaMock.annotation.mockResolvedValue([
      { data: [item('a', 4)], status: 'COMMITTED', authorId: 4 },
    ])

    const res = await getDefenseAnnotations(6)

    expect(res.payload?.status).toBe('COMMITTED')
  })

  // THE REGRESSION: a caller with no row of their own must report null, not
  // COMMITTED. Reporting COMMITTED made a panelist who had never annotated look
  // finished, which flipped isCommitted in the workspace page and rendered the
  // read-only finalized view with no way to submit.
  test('reports null when the caller has no row, even beside other committed rows', async () => {
    prismaMock.annotation.mockResolvedValue([
      { data: [item('x', 2)], status: 'COMMITTED', authorId: 2 },
      { data: [item('y', 3)], status: 'COMMITTED', authorId: 3 },
    ])

    const res = await getDefenseAnnotations(6)

    expect(res.success).toBe(true)
    // Other panelists' committed annotations are still returned for
    // cross-review, only the own-row status is null.
    expect(Array.isArray(res.payload?.data)).toBe(true)
    expect((res.payload?.data as unknown[]).length).toBeGreaterThan(0)
    expect(res.payload?.status).toBeNull()
  })

  test('returns a null payload when there are no annotations at all', async () => {
    prismaMock.annotation.mockResolvedValue([])

    const res = await getDefenseAnnotations(6)

    expect(res.success).toBe(true)
    expect(res.payload).toBeNull()
  })

  test('refuses a caller who is not a panelist on the defense', async () => {
    prismaMock.submission.mockResolvedValue(null)

    const res = await getDefenseAnnotations(6)

    expect(res.success).toBe(false)
  })
})
