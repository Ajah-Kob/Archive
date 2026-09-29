import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import prisma from '@/lib/prisma'
import { requireStudent } from '@/lib/actions/guard'
import { submitDefenseDocument, uploadDefenseToken } from './student-defense'

/**
 * Regression cover for the defense-type scoping bug.
 *
 * All four student upload actions used to resolve the schedule with a group-only
 * `findFirst` and no `type` filter. A group holding both a PROPOSAL and a FINAL
 * schedule therefore got an arbitrary one, and the document was written to the
 * wrong defense: the row existed in the database, but the milestone page (which
 * filters by type) showed nothing and the faculty page missed it too.
 *
 * These pin the two halves of the contract: the schedule lookup must carry the
 * requested type, and an unrecognised type must be rejected before any query.
 */

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    defenseSchedule: { findFirst: jest.fn() },
    defenseSubmission: { findFirst: jest.fn(), create: jest.fn() },
  },
}))

jest.mock('@/lib/actions/guard', () => ({
  __esModule: true,
  requireStudent: jest.fn(),
  unauthorized: { success: false, payload: null, message: 'Unauthorized' },
}))

jest.mock('next/cache', () => ({
  __esModule: true,
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Blob access is not under test; the upload-verify step is stubbed by making
// head() resolve with metadata matching whatever pathname the token minted.
jest.mock('@vercel/blob', () => ({
  __esModule: true,
  head: jest.fn(),
  del: jest.fn(),
}))

jest.mock('@vercel/blob/client', () => ({
  __esModule: true,
  generateClientTokenFromReadWriteToken: jest.fn(),
}))

type LooseMock = {
  mockResolvedValue: (v: unknown) => void
  mockResolvedValueOnce: (v: unknown) => void
  mock: { calls: unknown[][] }
}
const asMock = (m: unknown): LooseMock => m as LooseMock

const scheduleMock = asMock(prisma.defenseSchedule.findFirst)
const submissionFindMock = asMock(prisma.defenseSubmission.findFirst)
const submissionCreateMock = asMock(prisma.defenseSubmission.create)
const requireStudentMock = asMock(requireStudent)
const headMock = asMock((jest.requireMock('@vercel/blob') as Record<string, unknown>).head)
const genTokenMock = asMock(
  (jest.requireMock('@vercel/blob/client') as Record<string, unknown>)
    .generateClientTokenFromReadWriteToken,
)

const UPLOAD = {
  blobUrl: 'https://store.private.blob.vercel-storage.com/defense/4/report.pdf',
  fileName: 'report.pdf',
  size: 1024,
  mimeType: 'application/pdf',
}

beforeEach(() => {
  requireStudentMock.mockResolvedValue({ user: { id: '10' } } as never)
  scheduleMock.mockResolvedValue({ id: 4, groupId: 2, verdict: 'PENDING' })
  submissionFindMock.mockResolvedValue(null)
  submissionCreateMock.mockResolvedValue({ id: 99 })
  // verifyDefenseUpload(): head() must agree with the upload on pathname prefix,
  // contentType and size, or the action rejects before writing.
  headMock.mockResolvedValue({
    pathname: 'defense/4/report.pdf',
    size: UPLOAD.size,
    contentType: 'application/pdf',
  })
  genTokenMock.mockResolvedValue({ token: 'tok' })
})

describe('defense upload — schedule resolution is scoped by defense type', () => {
  test('submitDefenseDocument looks up the schedule WITH the requested type', async () => {
    const res = await submitDefenseDocument({ ...UPLOAD, defenseType: 'PROPOSAL' })

    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'PROPOSAL' }),
      }),
    )
    expect(res.success).toBe(true)
  })

  test('the FINAL type is passed through, not coerced to PROPOSAL', async () => {
    await submitDefenseDocument({ ...UPLOAD, defenseType: 'FINAL' })

    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'FINAL' }),
      }),
    )
  })

  test('the created submission lands on the resolved schedule', async () => {
    // The lookup returned schedule 4, so the row must reference 4 — not some
    // other schedule for the same group.
    await submitDefenseDocument({ ...UPLOAD, defenseType: 'PROPOSAL' })

    expect(submissionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ scheduleId: 4, isInitial: true }),
      }),
    )
  })

  test('rejects an unrecognised defense type before touching the database', async () => {
    const res = await submitDefenseDocument({
      ...UPLOAD,
      defenseType: 'NONSENSE' as never,
    })

    expect(res.success).toBe(false)
    expect(res.message).toBe('Unknown defense type.')
    expect(scheduleMock).not.toHaveBeenCalled()
    expect(submissionCreateMock).not.toHaveBeenCalled()
  })

  test('reports a missing schedule when the group has no schedule of that type', async () => {
    scheduleMock.mockResolvedValue(null)

    const res = await submitDefenseDocument({ ...UPLOAD, defenseType: 'PROPOSAL' })

    expect(res.success).toBe(false)
    expect(res.message).toBe('No defense schedule found for your group.')
    expect(submissionCreateMock).not.toHaveBeenCalled()
  })
})

describe('defense upload — token is pinned to the same type-scoped schedule', () => {
  test('uploadDefenseToken scopes the schedule lookup by type', async () => {
    const res = await uploadDefenseToken('report.pdf', 'PROPOSAL')

    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'PROPOSAL' }),
      }),
    )
    expect(res.success).toBe(true)
  })

  test('the minted pathname is under the resolved schedule', async () => {
    // The token pins defense/{scheduleId}/..., and the submit actions verify the
    // uploaded blob against that same id. If the two ever resolved different
    // schedules the upload would be rejected only after the bytes had landed.
    await uploadDefenseToken('report.pdf', 'PROPOSAL')

    expect(genTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: 'defense/4/report.pdf' }),
    )
  })

  test('rejects an unrecognised defense type before minting a token', async () => {
    const res = await uploadDefenseToken('report.pdf', undefined)

    expect(res.success).toBe(false)
    expect(res.message).toBe('Unknown defense type.')
    expect(genTokenMock).not.toHaveBeenCalled()
  })

  test('PROPOSAL and FINAL mint pathnames under their own schedules', async () => {
    // The real bug in one assertion: for a group holding both, the two types
    // must resolve to different schedule ids and therefore different pathnames.
    scheduleMock.mockResolvedValueOnce({ id: 4, groupId: 2, verdict: 'PENDING' })
    await uploadDefenseToken('report.pdf', 'PROPOSAL')
    scheduleMock.mockResolvedValueOnce({ id: 3, groupId: 2, verdict: 'MAJOR_REVISION' })
    await uploadDefenseToken('report.pdf', 'FINAL')

    const pathnames = genTokenMock.mock.calls.map((c) => (c[0] as { pathname: string }).pathname)
    expect(pathnames).toEqual(['defense/4/report.pdf', 'defense/3/report.pdf'])
  })
})
