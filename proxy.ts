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

const ADMIN_SET = new Set(['SUPERADMIN', 'ADMIN'])
const PROTECTED_SET = new Set(['/admin', '/faculty', '/student', '/guest', '/account', '/calendar'])

function isAdmin(role?: string): boolean {
  return ADMIN_SET.has(role ?? '')
}

function hasCoordinatorAccess(token: Token): boolean {
  return isAdmin(token.role) || token.isProgramChair === true || token.isCoordinator === true
}

function isAdminOrProgramChair(token: Token): boolean {
  return isAdmin(token.role) || token.isProgramChair === true
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // /login is handled client-side (RedirectIfAuthed) — no token needed at the edge
  if (pathname === '/login') return NextResponse.next()

  const seg = pathname.split('/', 3)
  const root = `/${seg[1]}`

  if (!PROTECTED_SET.has(root)) return NextResponse.next()

  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as Token | null

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const home = roleHome(token.role)
  const redirectHome = () => NextResponse.redirect(new URL(home, req.url))

  // Role-root isolation
  if (root === '/admin' && !isAdmin(token.role)) return redirectHome()
  if (root === '/student' && token.role !== 'STUDENT') return redirectHome()
  if (root === '/guest' && token.role !== 'GUEST') return redirectHome()
  if (root === '/faculty' && !isAdmin(token.role) && token.role !== 'FACULTY') return redirectHome()

  // Shared /calendar route — all signed-in roles except GUEST pass (no sub-role gate)
  if (root === '/calendar' && token.role === 'GUEST') return redirectHome()

  // Faculty sub-role gates — only when inside /faculty
  if (root === '/faculty') {
    const sub = seg[2]
    switch (sub) {
      case 'faculties':
      case 'sections':
      case 'templates':
      case 'defense-scheduling':
        if (!hasCoordinatorAccess(token)) return redirectHome()
        break
      case 'document-review':
        if (token.isAdviser !== true) return redirectHome()
        break
      case 'my-sections':
        if (token.isCoordinator !== true) return redirectHome()
        break
      case 'archiving':
        if (!isAdminOrProgramChair(token)) return redirectHome()
        break
      default:
        break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/faculty/:path*', '/student/:path*', '/guest/:path*', '/account/:path*', '/calendar/:path*'],
}
