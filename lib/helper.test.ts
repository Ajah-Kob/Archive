import { describe, expect, test } from '@jest/globals'
import { isAuthRoute, roleHome, safeNextPath } from './helper'

/**
 * roleHome governs where every signed-in user lands: after login
 * (RedirectIfAuthed), when proxy.ts bounces someone out of a role root, and as
 * the "Dashboard" href in the aside. Nothing tested it, so a role's landing
 * page could change silently. STUDENT is asserted explicitly because students
 * land on My Team rather than on the milestone journey.
 */
describe('roleHome', () => {
  test.each([
    ['SUPERADMIN', '/admin'],
    ['ADMIN', '/admin'],
    ['FACULTY', '/faculty'],
    ['STUDENT', '/student/my-team'],
  ])('sends %s to %s', (role, expected) => {
    expect(roleHome(role)).toBe(expected)
  })

  // GUEST, an unknown role, and a missing role all fall back to /guest so an
  // unauthenticated or malformed token can never produce a broken path.
  test.each([['GUEST'], ['NONSENSE'], [null], [undefined], ['']])(
    'falls back to /guest for %s',
    (role) => {
      expect(roleHome(role)).toBe('/guest')
    },
  )
})

describe('isAuthRoute', () => {
  test.each(['/login', '/signup', '/forgot-password', '/reset-password'])(
    'treats %s as an auth route',
    (path) => {
      expect(isAuthRoute(path)).toBe(true)
    },
  )

  // '/' is deliberately NOT an auth route — it is the public landing page, and
  // conflating the two hides why it is separately excluded from resume.
  test.each(['/', '/student/my-team', '/student/milestone', '/repository'])(
    'does not treat %s as an auth route',
    (path) => {
      expect(isAuthRoute(path)).toBe(false)
    },
  )

  test('handles empty input', () => {
    expect(isAuthRoute(null)).toBe(false)
    expect(isAuthRoute(undefined)).toBe(false)
    expect(isAuthRoute('')).toBe(false)
  })
})

describe('safeNextPath', () => {
  test('accepts a same-origin path', () => {
    expect(safeNextPath('/join/ABC123')).toBe('/join/ABC123')
  })

  test('rejects open redirects and non-paths', () => {
    expect(safeNextPath('//evil.com')).toBeNull()
    expect(safeNextPath('https://evil.com')).toBeNull()
    expect(safeNextPath('javascript:alert(1)')).toBeNull()
    expect(safeNextPath('')).toBeNull()
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
  })
})
