// Validates email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Returns a safe same-origin resume path from a `?next=` value, or null.
// Only allows paths starting with a single '/' — blocks open redirects like
// '//evil.com' or 'https://evil.com'. Used by the login/signup resume flow.
export function safeNextPath(value?: string | null): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  return value
}

// Routes a user should never be "returned" to: they are entry points into the
// auth flow, not destinations inside the app.
//
// Two places depend on this list agreeing, which is why it lives here rather
// than being inlined in each:
//   - RouteTracker must not record them as the tab's last route
//   - RedirectIfAuthed must not resume to them after login
//
// Getting this wrong is what made a fresh login bounce through /signup: the
// tracker recorded /signup (it is one click from /login), and the resume logic
// only excluded /login and '/', so the stale value won over roleHome. Note '/'
// is excluded for a different reason — it is a public landing page, not an auth
// route — so it is listed separately rather than folded in here.
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'] as const

export function isAuthRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return (AUTH_ROUTES as readonly string[]).includes(pathname)
}

// Returns the role-root home route for a given role, falling back to /guest.
// Used by the login flow, the proxy, and the Join flow to land users on their
// own role's home page after auth changes.
export function roleHome(role?: string | null): string {
  switch (role) {
    case 'SUPERADMIN':
    case 'ADMIN':
      return '/admin'
    case 'FACULTY':
      return '/faculty'
    case 'STUDENT':
      return '/student/my-team'
    default:
      return '/guest'
  }
}

// Extracts initials from a full name (e.g. "Dr. Maria Santos" → "MS")
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Generates invitation code — UPPERCASE letters + digits only so codes are
// easy to read out and type (no lowercase confusion).
export function generateJoinCode(length = 8): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return code
}

// Formats a date as a relative label ("Just now", "5 minutes ago",
// "2 hours ago", "Yesterday", "3 days ago", then a locale date).
export function timeAgo(date: Date | string): string {
  const target = new Date(date)
  const diffSeconds = Math.round((Date.now() - target.getTime()) / 1000)

  if (diffSeconds < 60) return 'Just now'

  const diffMinutes = Math.round(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return target.toLocaleDateString()
}
