import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { get, head, list } from '@vercel/blob'

const ADMIN_ROLES = new Set(['SUPERADMIN', 'ADMIN'])

/**
 * Auth-gated read route for private Vercel Blobs.
 *
 * Single Vercel Blob store — per-upload `access: 'private'` for
 * templates/chapter/defense/archiving, `public` for user/* avatars.
 * This route stays outside proxy.ts (does its own getServerSession) and
 * branches by prefix:
 *   templates/* → role !== GUEST
 *   chapter/*, defense/*, archiving/* → group member | adviser | coordinator-of-section | chair/admin
 *   archives/* → 404 (repository stays public via raw blobUrl — see lib/blob.ts note)
 *   invalid prefix → 404
 *
 * Anonymous → 401, deleted user → 401, cross-section coordinator → 403.
 * On success streams the bytes (200) via an authenticated SDK download.
 */

function isAdmin(role?: string | null): boolean {
  return ADMIN_ROLES.has(role ?? '')
}

async function isProgramChair(userId: number): Promise<boolean> {
  const fac = await prisma.faculty.findFirst({
    where: { userId, deletedAt: null, isProgramChair: true },
    select: { id: true },
  })
  return !!fac
}

async function isCoordinatorOfSection(userId: number, sectionId: number): Promise<boolean> {
  const fac = await prisma.faculty.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, coordinator: { select: { id: true, deletedAt: true } } },
  })
  if (!fac?.coordinator || fac.coordinator.deletedAt) return false
  const sec = await prisma.section.findFirst({
    where: { id: sectionId, coordinatorId: fac.coordinator.id, deletedAt: null },
    select: { id: true },
  })
  return !!sec
}

async function getGroupForId(groupId: number) {
  return prisma.group.findFirst({
    where: { id: groupId, deletedAt: null },
    select: {
      id: true,
      sectionId: true,
      adviserId: true,
      students: { where: { deletedAt: null }, select: { userId: true } },
    },
  })
}

async function authorizeGroupAccess(groupId: number, userId: number, role?: string | null): Promise<boolean> {
  if (isAdmin(role)) return true
  if (await isProgramChair(userId)) return true

  const group = await getGroupForId(groupId)
  if (!group) return false

  // Member of group (student)
  if (group.students.some((s) => s.userId === userId)) return true

  // Adviser of group
  if (group.adviserId != null) {
    const adviserFaculty = await prisma.adviser.findFirst({
      where: { id: group.adviserId, deletedAt: null },
      select: { facultyId: true },
    })
    if (adviserFaculty) {
      const fac = await prisma.faculty.findFirst({
        where: { id: adviserFaculty.facultyId, userId, deletedAt: null },
        select: { id: true, adviser: { select: { deletedAt: true } } },
      })
      if (fac?.adviser && !fac.adviser.deletedAt) return true
    }
  }

  // Coordinator of the group's section (section-scoped)
  if (await isCoordinatorOfSection(userId, group.sectionId)) return true

  return false
}

async function handleRequest(
  req: NextRequest,
  params: Promise<{ pathname: string[] }>,
) {
  // 1) Auth —.getServerSession + deletedAt null check
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const userId = Number(session.user.id)
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const dbUser = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, role: true },
  })
  if (!dbUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const role = (session.user.role as string) ?? dbUser.role

  // 2) Pathname validation — decode, reject traversal/empty, verify via head+pathname match
  const { pathname: segments } = await params
  const rawJoined = segments?.join('/') ?? ''
  if (!rawJoined || rawJoined.length === 0) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }
  let pathname: string
  try {
    pathname = decodeURIComponent(rawJoined)
  } catch {
    pathname = rawJoined
  }
  // Reject traversal, leading slash, double slash
  if (
    pathname.includes('..') ||
    pathname.startsWith('/') ||
    pathname.includes('//') ||
    pathname.trim().length === 0
  ) {
    return NextResponse.json({ message: 'Invalid pathname' }, { status: 400 })
  }

  // Repository archives/* stays public — not served via signed route (see lib/blob.ts note)
  // Return 404 so callers keep using the raw public URL for /repository.
  if (pathname.startsWith('archives/')) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  // 3) Branch by prefix
  // Templates → any non-GUEST
  if (pathname.startsWith('templates/')) {
    if (role === 'GUEST') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    // verify blob exists via list+head
    const verified = await verifyBlobPathname(pathname)
    if (!verified) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return await serveBlob(pathname, req)
  }

  // Archiving → archiving/{groupId}/...
  if (pathname.startsWith('archiving/')) {
    const parts = pathname.split('/')
    const groupId = Number(parts[1])
    if (!Number.isInteger(groupId)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const allowed = await authorizeGroupAccess(groupId, userId, role)
    if (!allowed) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    const verified = await verifyBlobPathname(pathname)
    if (!verified) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return await serveBlob(pathname, req)
  }

  // Chapter → chapter/{groupId}/{chapter}/...
  if (pathname.startsWith('chapter/')) {
    const parts = pathname.split('/')
    const groupId = Number(parts[1])
    if (!Number.isInteger(groupId)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    // Validate chapter enum segment exists (CHAPTER_1 etc.) — but allow any for head check
    const allowed = await authorizeGroupAccess(groupId, userId, role)
    if (!allowed) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    const verified = await verifyBlobPathname(pathname)
    if (!verified) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return await serveBlob(pathname, req)
  }

  // Defense → defense/{scheduleId}/...
  if (pathname.startsWith('defense/')) {
    const parts = pathname.split('/')
    const scheduleId = Number(parts[1])
    if (!Number.isInteger(scheduleId)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    // Map schedule -> group
    const schedule = await prisma.defenseSchedule.findFirst({
      where: { id: scheduleId, deletedAt: null },
      select: { groupId: true },
    })
    if (!schedule) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const allowed = await authorizeGroupAccess(schedule.groupId, userId, role)
    if (!allowed) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    const verified = await verifyBlobPathname(pathname)
    if (!verified) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    return await serveBlob(pathname, req)
  }

  // Invalid prefix → 404
  return NextResponse.json({ message: 'Not found' }, { status: 404 })
}

function decodeOnce(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// Encoding-agnostic pathname comparison. Keys with spaces/special chars may
// come back from list()/head() percent-encoded while the request path is
// already decoded (or vice versa) — strict === would 404 on existing blobs.
function sameBlobPath(a: string, b: string): boolean {
  if (a === b) return true
  return decodeOnce(a) === decodeOnce(b)
}

async function verifyBlobPathname(pathname: string): Promise<{ blobUrl: string; downloadUrl: string; pathname: string } | null> {
  // Use Vercel Blob list to locate the blob by exact pathname (private blobs included via token).
  // Then verify via head that the returned pathname matches the requested one (head+pathname match).
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    // list with prefix narrows to the exact file; filter to exact pathname match.
    const result: { blobs: Array<{ pathname: string; url: string; downloadUrl?: string }> } = (await (list as unknown as (opts: unknown) => Promise<unknown>)({
      prefix: pathname,
      token,
      limit: 100,
    })) as unknown as { blobs: Array<{ pathname: string; url: string; downloadUrl?: string }> }

    const matched = result.blobs?.find((b) => sameBlobPath(b.pathname, pathname))
    if (!matched) {
      console.error(
        `[blob route | no match]: want=${pathname} candidates=${JSON.stringify((result.blobs ?? []).map((b) => b.pathname))}`,
      )
      return null
    }

    // Head+pathname verification — ensures the blob's server pathname matches requested pathname.
    try {
      const meta = await head(matched.url, token ? ({ token } as unknown as never) : undefined)
      if (!meta || !sameBlobPath(meta.pathname, pathname)) return null
      // Prefer head's downloadUrl if provided (signed), otherwise use list's.
      return {
        blobUrl: matched.url,
        downloadUrl: (meta as unknown as { downloadUrl?: string }).downloadUrl ?? matched.downloadUrl ?? matched.url,
        pathname: meta.pathname,
      }
    } catch {
      // Head failed but list already matched — still treat as found if list matched exactly.
      // Keep list's downloadUrl/url as fallback (still requires token via head for private).
      return { blobUrl: matched.url, downloadUrl: matched.downloadUrl ?? matched.url, pathname: matched.pathname }
    }
  } catch (err) {
    console.error('[blob route | list/head error]:', err)
    return null
  }
}

async function serveBlob(pathname: string, req: NextRequest) {
  if (req.method === 'HEAD') {
    return new NextResponse(null, { status: 200 })
  }

  // Authenticated server-side download: private blobs have no usable
  // tokenless URL (downloadUrl is just ?download=1 and 403s), so fetch via
  // the SDK get() with a Bearer token and stream the bytes same-origin.
  // The route stays the single private gate; the browser never sees blob URLs.
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('[blob route | missing BLOB_READ_WRITE_TOKEN]')
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }
  try {
    const result = await (get as unknown as (
      p: string,
      o: unknown,
    ) => Promise<{
      statusCode: number
      stream: ReadableStream | null
      headers: Headers
      blob: { contentType: string }
    } | null>)(pathname, { access: 'private', token })
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const headers = new Headers()
    const ct = result.blob?.contentType || result.headers.get('content-type')
    if (ct) headers.set('content-type', ct)
    const cl = result.headers.get('content-length')
    if (cl) headers.set('content-length', cl)
    headers.set('cache-control', 'private, max-age=60')
    return new NextResponse(result.stream as unknown as BodyInit, {
      status: 200,
      headers,
    })
  } catch (err) {
    console.error('[blob route | get error]:', err)
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ pathname: string[] }> }) {
  return handleRequest(req, context.params as Promise<{ pathname: string[] }>)
}

export async function HEAD(req: NextRequest, context: { params: Promise<{ pathname: string[] }> }) {
  return handleRequest(req, context.params as Promise<{ pathname: string[] }>)
}
