export const SYSTEM_LINK_MESSAGE = {
  INVALID_URL: 'Enter a valid http or https link.',
  INVALID_LABEL: 'Give the link a short label.',
  LOCKED: 'Links are locked once the chair submits the verdict.',
  NOT_SUBMITTED: 'No links submitted yet.',
} as const

/**
 * User-supplied URLs are rendered as anchors, so the scheme is checked here and
 * again in the server action. `new URL` throws on a relative path, which is the
 * outcome we want -- only absolute http(s) links are allowed.
 */
export function isAllowedLinkUrl(raw: string): boolean {
  if (!raw || !raw.trim()) return false
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Derived from the existing verdict rather than a stored flag, so there is
 * nothing to keep in sync.
 */
export function linksAreEditable(verdict: string): boolean {
  return verdict === 'PENDING'
}