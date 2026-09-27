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
const prismaMock = { user: { findFirst: asMock(prisma.user.findFirst) } }
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
