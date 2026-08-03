// Validates email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
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

// Generates invitation code
export function generateJoinCode(length = 8): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
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
