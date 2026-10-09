import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { get, head, list } from '@vercel/blob'
import { GET } from './route'

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findFirst: jest.fn() },
    faculty: { findFirst: jest.fn() },
    section: { findFirst: jest.fn() },
    group: { findFirst: jest.fn() },
    adviser: { findFirst: jest.fn() },
    defenseSchedule: { findFirst: jest.fn() },
    defensePanelist: { findFirst: jest.fn() },
    capstoneArchive: { findMany: jest.fn() },
  },
}))

jest.mock('@vercel/blob', () => ({
  __esModule: true,
  get: jest.fn(),
  head: jest.fn(),
  list: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}))

jest.mock('@/lib/authOptions', () => ({
  authOptions: {},
}))

/** Loose mock handle — the SDKs are mocked wholesale so arg types don't matter. */
type LooseMock = {
  mockResolvedValue: (value: any) => void
  mockImplementation: (fn: (...args: any[]) => any) => void
  mockReturnValue: (value: any) => void
}
const asMock = (m: unknown): LooseMock => m as LooseMock

const getServerSession = asMock((jest.requireMock('next-auth') as Record<string, unknown>).getServerSession)
const prismaMock = {
  user: { findFirst: asMock(prisma.user.findFirst) },
  defenseSchedule: { findFirst: asMock(prisma.defenseSchedule.findFirst) },
  defensePanelist: { findFirst: asMock(prisma.defensePanelist.findFirst) },
  faculty: { findFirst: asMock(prisma.faculty.findFirst) },
  group: { findFirst: asMock(prisma.group.findFirst) },
  adviser: { findFirst: asMock(prisma.adviser.findFirst) },
  section: { findFirst: asMock(prisma.section.findFirst) },
  capstoneArchive: { findMany: asMock((prisma as unknown as { capstoneArchive: { findMany: unknown } }).capstoneArchive.findMany) },
}
const listMock = asMock(list)
const headMock = asMock(head)
const getMock = asMock(get)

const HOST = 'https://store.public.blob.vercel-storage.com'
const BLOB_URL = `${HOST}/archives/thesis-abc.pdf`
const ARCHIVE_PATH = 'archives/thesis-abc.pdf'

function req(pathname: string[]) {
  return new NextRequest(`http://localhost:3000/api/blob/${pathname.join('/')}`)
}

function ctx(pathname: string[]) {
  return { params: Promise.resolve({ pathname }) }
}

/** Make `archives/...` resolvable so the test exercises auth, not blob lookup. */
function blobExists() {
  listMock.mockResolvedValue({
    blobs: [{ pathname: ARCHIVE_PATH, url: BLOB_URL, downloadUrl: BLOB_URL }],
  })
  headMock.mockResolvedValue({ pathname: ARCHIVE_PATH, downloadUrl: BLOB_URL })
  getMock.mockResolvedValue({
    statusCode: 200,
    stream: new ReadableStream(),
    headers: new Headers({ 'content-type': 'application/pdf' }),
    blob: { contentType: 'application/pdf' },
  })
}

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
  blobExists()
  // Default: nothing published, so archiving/* falls through to group auth.
  prismaMock.capstoneArchive.findMany.mockResolvedValue([])
})

describe('blob route — archives/* authorization', () => {
  test('rejects anonymous callers with 401', async () => {
    getServerSession.mockResolvedValue(null)

    const res = await GET(req([ARCHIVE_PATH]), ctx([ARCHIVE_PATH]))

    expect(res.status).toBe(401)
    expect(getMock).not.toHaveBeenCalled()
  })

  test('rejects soft-deleted users with 401', async () => {
    getServerSession.mockResolvedValue({ user: { id: '9', role: 'GUEST' } })
    prismaMock.user.findFirst.mockResolvedValue(null)

    const res = await GET(req([ARCHIVE_PATH]), ctx([ARCHIVE_PATH]))

    expect(res.status).toBe(401)
    expect(getMock).not.toHaveBeenCalled()
  })

  // The policy we chose: published capstone work is not group-scoped, so any
  // signed-in role may read it — GUEST included, unlike templates/*.
  test.each(['GUEST', 'STUDENT', 'FACULTY', 'SUPERADMIN'])(
    'allows a signed-in %s to read an archive',
    async (role) => {
      getServerSession.mockResolvedValue({ user: { id: '9', role } })
      prismaMock.user.findFirst.mockResolvedValue({ id: 9, role })

      const res = await GET(req([ARCHIVE_PATH]), ctx([ARCHIVE_PATH]))

      expect(res.status).toBe(200)
      expect(getMock).toHaveBeenCalledWith(
        ARCHIVE_PATH,
        expect.objectContaining({ access: 'private' }),
      )
    },
  )

  test('404s when no archive blob matches the pathname', async () => {
    getServerSession.mockResolvedValue({ user: { id: '9', role: 'ADMIN' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 9, role: 'ADMIN' })
    listMock.mockResolvedValue({ blobs: [] })

    const res = await GET(req([ARCHIVE_PATH]), ctx([ARCHIVE_PATH]))

    expect(res.status).toBe(404)
  })

  test('still rejects path traversal before any branch', async () => {
    getServerSession.mockResolvedValue({ user: { id: '9', role: 'ADMIN' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 9, role: 'ADMIN' })

    const res = await GET(req(['archives', '..', 'chapter', 'secret.pdf']), ctx(['archives', '..', 'chapter', 'secret.pdf']))

    expect(res.status).toBe(400)
    expect(getMock).not.toHaveBeenCalled()
  })

  test('404s an unknown prefix', async () => {
    getServerSession.mockResolvedValue({ user: { id: '9', role: 'ADMIN' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 9, role: 'ADMIN' })

    const res = await GET(req(['secrets', 'x.pdf']), ctx(['secrets', 'x.pdf']))

    expect(res.status).toBe(404)
  })
})

// Avatars moved to access:'private' (the store rejects public), so they come
// through this route too. Not self-only: member avatars render next to other
// people in group lists.
describe('blob route — user/* avatars', () => {
  const AVATAR_PATH = 'user/9/avatar-abc.png'
  const AVATAR_URL = `${HOST}/${AVATAR_PATH}`

  beforeEach(() => {
    listMock.mockResolvedValue({
      blobs: [{ pathname: AVATAR_PATH, url: AVATAR_URL, downloadUrl: AVATAR_URL }],
    })
    headMock.mockResolvedValue({ pathname: AVATAR_PATH, downloadUrl: AVATAR_URL })
    getMock.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream(),
      headers: new Headers({ 'content-type': 'image/png' }),
      blob: { contentType: 'image/png' },
    })
  })

  test('rejects anonymous callers with 401', async () => {
    getServerSession.mockResolvedValue(null)
    const res = await GET(req([AVATAR_PATH]), ctx([AVATAR_PATH]))
    expect(res.status).toBe(401)
    expect(getMock).not.toHaveBeenCalled()
  })

  test('lets any signed-in role read an avatar, including GUEST', async () => {
    getServerSession.mockResolvedValue({ user: { id: '4', role: 'GUEST' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 4, role: 'GUEST' })

    const res = await GET(req([AVATAR_PATH]), ctx([AVATAR_PATH]))

    expect(res.status).toBe(200)
    expect(getMock).toHaveBeenCalledWith(
      AVATAR_PATH,
      expect.objectContaining({ access: 'private' }),
    )
  })

  test('serves another user’s avatar (member lists need this)', async () => {
    getServerSession.mockResolvedValue({ user: { id: '4', role: 'STUDENT' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 4, role: 'STUDENT' })

    const res = await GET(req([AVATAR_PATH]), ctx([AVATAR_PATH]))

    expect(res.status).toBe(200)
  })
})

// ──────────────────── defense/* — panelist authorization ─────────────────────
//
// Regression cover for a real bug: `authorizeGroupAccess` only admits the
// group-scoped identities (member | adviser | section coordinator | chair |
// admin), but a panelist is linked to a SCHEDULE via `DefensePanelist`. So a
// panelist who held none of those five got a 403 and the document viewer showed
// "Failed to load this document." — they could not open the very document they
// were assigned to review. The `defense/*` branch had no tests at all, which is
// how it shipped.
//
// These mirror the live data that exposed it: group 1 has adviserId = null, the
// section coordinator is user 3, the chair is user 2, and user 4
// (coordinator2) is a PANEL_MEMBER holding none of them.
describe('blob route — defense/* panelist authorization', () => {
  const DEFENSE_PATH = 'defense/1/Sample File.pdf'
  const SCHEDULE = 1
  const GROUP = 1

  function defenseBlobExists() {
    listMock.mockResolvedValue({
      blobs: [{ pathname: DEFENSE_PATH, url: `${HOST}/${DEFENSE_PATH}`, downloadUrl: `${HOST}/${DEFENSE_PATH}` }],
    })
    headMock.mockResolvedValue({
      pathname: DEFENSE_PATH,
      downloadUrl: `${HOST}/${DEFENSE_PATH}`,
    })
    getMock.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream(),
      headers: new Headers({ 'content-type': 'application/pdf' }),
      blob: { contentType: 'application/pdf' },
    })
  }

  beforeEach(() => {
    defenseBlobExists()
    prismaMock.defenseSchedule.findFirst.mockResolvedValue({ groupId: GROUP })
    // Default: not a panelist, and not staff/related to the group.
    prismaMock.defensePanelist.findFirst.mockResolvedValue(null)
    // Must be null, NOT a faculty row: isProgramChair() is `return !!fac` — it
    // trusts the query's `where` filter and never inspects the returned row, so
    // returning any faculty object would make this user look like a chair.
    prismaMock.faculty.findFirst.mockResolvedValue(null)
    prismaMock.group.findFirst.mockResolvedValue({
      id: GROUP,
      sectionId: 1,
      adviserId: null,
      students: [],
    })
  })

  // This is the exact shape of coordinator2@domain.com: a PANEL_MEMBER on the
  // schedule, with adviserId null on the group and a different user holding the
  // section coordinator seat.
  test('lets a panelist read the document they are assigned to', async () => {
    getServerSession.mockResolvedValue({ user: { id: '4', role: 'FACULTY' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 4, role: 'FACULTY' })
    prismaMock.defensePanelist.findFirst.mockResolvedValue({ id: 9 })

    const res = await GET(req([DEFENSE_PATH]), ctx([DEFENSE_PATH]))

    expect(res.status).toBe(200)
    expect(getMock).toHaveBeenCalledWith(
      DEFENSE_PATH,
      expect.objectContaining({ access: 'private' }),
    )
  })

  test('scopes the panelist grant to that schedule', async () => {
    getServerSession.mockResolvedValue({ user: { id: '4', role: 'FACULTY' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 4, role: 'FACULTY' })
    prismaMock.defensePanelist.findFirst.mockResolvedValue({ id: 9 })

    await GET(req([DEFENSE_PATH]), ctx([DEFENSE_PATH]))

    // The lookup must be keyed on the schedule in the pathname, not a global
    // "is this user any kind of panelist" check.
    expect(prismaMock.defensePanelist.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          defenseScheduleId: SCHEDULE,
          userId: 4,
        }),
      }),
    )
  })

  test('still denies a signed-in user who is neither panelist nor group-scoped', async () => {
    getServerSession.mockResolvedValue({ user: { id: '77', role: 'FACULTY' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 77, role: 'FACULTY' })
    prismaMock.defensePanelist.findFirst.mockResolvedValue(null)

    const res = await GET(req([DEFENSE_PATH]), ctx([DEFENSE_PATH]))

    expect(res.status).toBe(403)
    expect(getMock).not.toHaveBeenCalled()
  })

  test('ignores a soft-deleted panelist row', async () => {
    getServerSession.mockResolvedValue({ user: { id: '4', role: 'FACULTY' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 4, role: 'FACULTY' })
    prismaMock.defensePanelist.findFirst.mockResolvedValue(null)

    await GET(req([DEFENSE_PATH]), ctx([DEFENSE_PATH]))

    expect(prismaMock.defensePanelist.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    )
  })

  test('404s an unknown schedule before authorizing', async () => {
    getServerSession.mockResolvedValue({ user: { id: '4', role: 'FACULTY' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 4, role: 'FACULTY' })
    prismaMock.defenseSchedule.findFirst.mockResolvedValue(null)

    const res = await GET(req([DEFENSE_PATH]), ctx([DEFENSE_PATH]))

    expect(res.status).toBe(404)
    expect(prismaMock.defensePanelist.findFirst).not.toHaveBeenCalled()
  })

  test('404s a non-numeric schedule segment', async () => {
    getServerSession.mockResolvedValue({ user: { id: '4', role: 'FACULTY' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 4, role: 'FACULTY' })

    const res = await GET(req(['defense', 'abc', 'x.pdf']), ctx(['defense', 'abc', 'x.pdf']))

    expect(res.status).toBe(404)
  })
})

// ─────────────── archiving/* referenced by a published archive ──────────────
//
// Regression cover for a real bug: approveArchiving references the
// submission's archiving/* blob directly instead of copying it under
// archives/*, so every chair-approved capstone kept an archiving/* pathname
// and 403d for readers outside its group. Published work is not group-scoped,
// so any signed-in user may read it; unpublished blobs still need group access.
describe('blob route — archiving/* published to the repository', () => {
  const PUBLISHED_PATH = 'archiving/2/Sample File-abc.pdf'
  const PUBLISHED_URL = `${HOST}/${encodeURI(PUBLISHED_PATH)}`

  function archivingBlobExists() {
    listMock.mockResolvedValue({
      blobs: [{ pathname: PUBLISHED_PATH, url: PUBLISHED_URL, downloadUrl: PUBLISHED_URL }],
    })
    headMock.mockResolvedValue({ pathname: PUBLISHED_PATH, downloadUrl: PUBLISHED_URL })
    getMock.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream(),
      headers: new Headers({ 'content-type': 'application/pdf' }),
      blob: { contentType: 'application/pdf' },
    })
  }

  beforeEach(() => {
    archivingBlobExists()
    // Signed in as a student with no relation to group 2.
    getServerSession.mockResolvedValue({ user: { id: '9', role: 'STUDENT' } })
    prismaMock.user.findFirst.mockResolvedValue({ id: 9, role: 'STUDENT' })
    prismaMock.faculty.findFirst.mockResolvedValue(null)
    prismaMock.group.findFirst.mockResolvedValue({
      id: 2,
      sectionId: 1,
      adviserId: null,
      students: [],
    })
  })

  test('lets an out-of-group reader open a published archiving blob', async () => {
    prismaMock.capstoneArchive.findMany.mockResolvedValue([{ blobUrl: PUBLISHED_URL }])

    const res = await GET(req(['archiving', '2', 'Sample File-abc.pdf']), ctx(['archiving', '2', 'Sample File-abc.pdf']))

    expect(res.status).toBe(200)
    expect(getMock).toHaveBeenCalledWith(
      PUBLISHED_PATH,
      expect.objectContaining({ access: 'private' }),
    )
  })

  test('still 403s an unpublished archiving blob for outsiders', async () => {
    prismaMock.capstoneArchive.findMany.mockResolvedValue([])

    const res = await GET(req(['archiving', '2', 'Sample File-abc.pdf']), ctx(['archiving', '2', 'Sample File-abc.pdf']))

    expect(res.status).toBe(403)
    expect(getMock).not.toHaveBeenCalled()
  })

  test('stops serving a published blob once the archive is soft-deleted', async () => {
    // findMany is filtered to deletedAt: null by the implementation, so a
    // soft-deleted archive simply never appears here.
    prismaMock.capstoneArchive.findMany.mockResolvedValue([])

    const res = await GET(req(['archiving', '2', 'Sample File-abc.pdf']), ctx(['archiving', '2', 'Sample File-abc.pdf']))

    expect(res.status).toBe(403)
  })
})
