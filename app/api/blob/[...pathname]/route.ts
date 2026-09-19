import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { head, list } from '@vercel/blob'

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
 * On success returns 302 to the signed downloadUrl or 200 stream.
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
    return await serveBlob(verified.blobUrl, verified.downloadUrl, req)
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
    return await serveBlob(verified.blobUrl, verified.downloadUrl, req)
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
    return await serveBlob(verified.blobUrl, verified.downloadUrl, req)
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
    return await serveBlob(verified.blobUrl, verified.downloadUrl, req)
  }

  // Invalid prefix → 404
  return NextResponse.json({ message: 'Not found' }, { status: 404 })
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

    const matched = result.blobs?.find((b) => b.pathname === pathname)
    if (!matched) return null

    // Head+pathname verification — ensures the blob's server pathname matches requested pathname.
    try {
      const meta = await head(matched.url, token ? { token } as unknown as never : undefined)
      if (meta?.pathname !== pathname) return null
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

async function serveBlob(blobUrl: string, downloadUrl: string, req: NextRequest) {
  // On success: 302 to signed downloadUrl (spec allows 200 stream or 302 signed URL).
  // Prefer redirect so the browser/pdf engine fetches directly with a time-limited signed URL
  // and we don't buffer large PDFs in the route. Use BLOB_READ_WRITE_TOKEN server-side only.
  //
  // If the client requested JSON (e.g. viewers doing fetch with credentials that expect JSON),
  // we return JSON; but for PDF loads we redirect. The viewer handles both shapes.
  // For simplicity always redirect — viewers that fetch will follow redirect (fetch with redirect:follow)
  // or can handle 302. Alternatively we could stream:
  //   const res = await fetch(downloadUrl || blobUrl)
  //   return new NextResponse(res.body, { headers: { 'content-type': res.headers.get('content-type') ?? 'application/pdf' } })
  //
  // Use redirect for large-file efficiency; clients that `fetch` will follow.
  const urlToServe = downloadUrl || blobUrl

  // If HEAD request, just verify and return 200 without body
  if (req.method === 'HEAD') {
    return new NextResponse(null, { status: 200 })
  }

  // Check if caller expects JSON (via Accept header) — if so return JSON payload with URL,
  // otherwise redirect. Viewers handle both.
  const accept = req.headers.get('accept') ?? ''
  if (accept.includes('application/json')) {
    return NextResponse.json({ url: urlToServe, downloadUrl: urlToServe })
  }

  // For PDF viewers that set initialDocuments [{url}], they can use this redirect URL directly as src
  // if they use the signed route URL as src. But fetching via signed route as stream is also valid.
  // Return redirect.
  return NextResponse.redirect(urlToServe, 302)
}

export async function GET(req: NextRequest, context: { params: Promise<{ pathname: string[] }> }) {
  return handleRequest(req, context.params as Promise<{ pathname: string[] }>)
}

export async function HEAD(req: NextRequest, context: { params: Promise<{ pathname: string[] }> }) {
  return handleRequest(req, context.params as Promise<{ pathname: string[] }>)
}
