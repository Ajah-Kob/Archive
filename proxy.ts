import { NextResponse, NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { JWT } from 'next-auth/jwt'
import { roleHome } from '@/lib/helper'

interface Token extends JWT {
  role?: string
  isProgramChair?: boolean
  isCoordinator?: boolean
  isAdviser?: boolean
}

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN']
const PROTECTED_ROOTS = ['/admin', '/faculty', '/student', '/guest', '/account']

// Faculty sub-role helpers. Admins pass root-level checks but do NOT inherit
// coordinator/adviser records, so those routes check the explicit flags.
function isAdmin(role?: string): boolean {
  return ADMIN_ROLES.includes(role ?? '')
}

function hasCoordinatorAccess(token: Token): boolean {
  return (
    isAdmin(token.role) ||
    token.isProgramChair === true ||
    token.isCoordinator === true
  )
}

function isAdminOrProgramChair(token: Token): boolean {
  return isAdmin(token.role) || token.isProgramChair === true
}

function startsWithPath(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`)
}

export async function proxy(req: NextRequest) {
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as Token | null
  const { pathname } = req.nextUrl

  const protectedRoot = PROTECTED_ROOTS.find((root) =>
    startsWithPath(pathname, root),
  )

  // Unauthenticated users cannot reach any protected role/account root.
  if (protectedRoot && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Route protection: role-root isolation + sub-role checks (token-based).
  // Page layouts no longer guard routes — the proxy is the single authority.
  // Tradeoff: role/sub-role changes reflect in the JWT within ~60s (client
  // session poll). Server actions still DB-check every mutation instantly.
  if (token) {
    if (startsWithPath(pathname, '/admin') && !isAdmin(token.role)) {
      return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    }
    if (startsWithPath(pathname, '/student') && token.role !== 'STUDENT') {
      return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    }
    if (startsWithPath(pathname, '/guest') && token.role !== 'GUEST') {
      return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    }
    if (
      startsWithPath(pathname, '/faculty') &&
      !isAdmin(token.role) &&
      token.role !== 'FACULTY'
    ) {
      return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    }

    // Faculty sub-role routes (only reachable by admins/faculty, see above).
    if (startsWithPath(pathname, '/faculty/faculties')) {
      if (!hasCoordinatorAccess(token))
        return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    } else if (startsWithPath(pathname, '/faculty/sections')) {
      if (!isAdminOrProgramChair(token))
        return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    } else if (startsWithPath(pathname, '/faculty/templates')) {
      if (!hasCoordinatorAccess(token))
        return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    } else if (startsWithPath(pathname, '/faculty/evaluation')) {
      if (token.isAdviser !== true)
        return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    } else if (startsWithPath(pathname, '/faculty/my-section')) {
      if (token.isCoordinator !== true)
        return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    } else if (startsWithPath(pathname, '/faculty/coordinators')) {
      if (!hasCoordinatorAccess(token))
        return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    } else if (startsWithPath(pathname, '/faculty/defense-scheduling')) {
      if (!hasCoordinatorAccess(token))
        return NextResponse.redirect(new URL(roleHome(token.role), req.url))
    }
  }

  // Signed-in users who open /login are sent back to their previous route by
  // the client-side RedirectIfAuthed guard on the login page (the server
  // cannot know where they came from). Expired sessions simply see the form.

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/faculty/:path*', '/student/:path*', '/guest/:path*', '/account/:path*', '/login'],
}