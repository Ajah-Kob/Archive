/**
 * Pure validation helpers for Archiving Milestone.
 *
 * Each helper is a pure function (same input → same output, no side effects),
 * small (<50 lines), composable, and testable in isolation.
 *
 * Lifecycle mapping:
 *  - READY_FOR_ARCHIVING (UI)  ↔ DRAFT (DB ArchivingStatus)
 *  - IN_REVIEW  ↔ IN_REVIEW
 *  - CAPSTONE_ARCHIVED (UI) ↔ ARCHIVED (DB)
 *
 * Authors JSON preserves order and distinguishes linked vs custom:
 *  - { lastName, firstName, email, userId: number } → linked student
 *  - { lastName, firstName, email, userId: null }    → custom author
 *  - Order is array order; group removal does not delete the snapshot.
 */

// ───────────────────────────── constants ─────────────────────────────

export const TITLE_MAX_WORDS = 25
export const TITLE_MAX_CHARS = 200
export const ABSTRACT_MAX_SENTENCES = 4
export const ABSTRACT_MAX_CHARS = 600
export const PDF_MIME = 'application/pdf' as const

// ───────────────────────────── types ─────────────────────────────

export interface AuthorEntry {
  lastName: string
  firstName: string
  email: string
  userId: number | null
  /** Stable UI key — not displayed, persisted in JSON for reorder stability. Optional for back-compat with old drafts. */
  id?: string
}

// ───────────────────────────── primitive counters (pure) ─────────────────────────────

/** Counts words via whitespace split (Fig­ma live 53/200 uses same). */
export function countWords(input: string): number {
  const trimmed = input.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

/** Counts chars exactly (matches 200 / 600 live counters). */
export function countChars(input: string): number {
  return input.length
}

/** Counts sentences by splitting on [.!?] and trimming empties. */
export function countSentences(input: string): number {
  const trimmed = input.trim()
  if (trimmed.length === 0) return 0
  return trimmed
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length
}

// ───────────────────────────── email ─────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

// ───────────────────────────── title ─────────────────────────────

export function isValidTitle(title: string): boolean {
  if (typeof title !== 'string') return false
  if (title.trim().length === 0) return false
  if (countChars(title) > TITLE_MAX_CHARS) return false
  const words = countWords(title)
  return words >= 1 && words <= TITLE_MAX_WORDS
}

// ───────────────────────────── abstract ─────────────────────────────

export function isValidAbstract(abstract: string): boolean {
  if (typeof abstract !== 'string') return false
  if (abstract.trim().length === 0) return false
  if (countChars(abstract) > ABSTRACT_MAX_CHARS) return false
  const sentences = countSentences(abstract)
  return sentences >= 1 && sentences <= ABSTRACT_MAX_SENTENCES
}

// ───────────────────────────── tags ─────────────────────────────

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

function hasDuplicateTags(tags: string[]): boolean {
  const normalized = tags.map(normalizeTag)
  return new Set(normalized).size !== normalized.length
}

function hasEmptyTag(tags: string[]): boolean {
  return tags.some((t) => t.trim().length === 0)
}

export function isValidTags(tags: string[]): boolean {
  if (!Array.isArray(tags)) return false
  if (tags.length < 1) return false
  if (hasEmptyTag(tags)) return false
  if (hasDuplicateTags(tags)) return false
  return true
}

// ───────────────────────────── authors ─────────────────────────────

function isAuthorFieldValid(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function authorEmailKey(a: AuthorEntry): string {
  return a.email.trim().toLowerCase()
}

function authorNameKey(a: AuthorEntry): string {
  return `${a.firstName.trim().toLowerCase()}|${a.lastName.trim().toLowerCase()}`
}

function hasDuplicateAuthors(authors: AuthorEntry[]): boolean {
  const emails = authors.map(authorEmailKey)
  if (new Set(emails).size !== emails.length) return true
  const names = authors.map(authorNameKey)
  if (new Set(names).size !== names.length) return true
  return false
}

export function isValidAuthors(authors: AuthorEntry[]): boolean {
  if (!Array.isArray(authors)) return false
  if (authors.length < 1) return false
  const allFieldsValid = authors.every(
    (a) =>
      isAuthorFieldValid(a.lastName) &&
      isAuthorFieldValid(a.firstName) &&
      isAuthorFieldValid(a.email) &&
      isValidEmailFormat(a.email),
  )
  if (!allFieldsValid) return false
  if (hasDuplicateAuthors(authors)) return false
  return true
}

// ───────────────────────────── mime ─────────────────────────────

export function isPdfMime(mime: string): boolean {
  if (typeof mime !== 'string') return false
  return mime.trim().toLowerCase() === PDF_MIME
}

// ───────────────────────────── repository formatting (pure) ─────────────────────────────

/**
 * Returns initials for a firstName: "John" → "J.", "John Michael" → "J.M."
 * Sliced to 2 parts max per prompt (2 initials if 2 names).
 */
export function formatAuthorInitials(firstName: string): string {
  const parts = (firstName ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return ''
  return parts.map((p) => `${p[0]!.toUpperCase()}.`).join('')
}

/**
 * Formats ordered authors for Repository preview: "Gutierrez, A.J.; Regalario, C.J."
 * Uses Lastname, Initials (2 initials if two first names) and semicolon separator.
 * Order is preserved exactly as persisted JSON (custom vs linked not reconstructed).
 */
export function formatAuthorsForRepository(authors: AuthorEntry[]): string {
  if (!Array.isArray(authors) || authors.length === 0) return ''
  return authors
    .map((a) => {
      const last = (a.lastName ?? '').trim()
      const first = (a.firstName ?? '').trim()
      if (!last && !first) return (a.email ?? '').trim()
      if (!last) return first
      if (!first) return last
      const initials = formatAuthorInitials(first)
      if (!initials) return last
      return `${last}, ${initials}`
    })
    .filter(Boolean)
    .join('; ')
}

/**
 * Alias used by CapstonePreviewModal — same formatting but joins with " · "
 * for the preview card's author line.
 */
export function formatAuthorsForPreview(authors: AuthorEntry[]): string {
  if (!Array.isArray(authors) || authors.length === 0) return ''
  return authors
    .map((a) => {
      const last = (a.lastName ?? '').trim()
      const first = (a.firstName ?? '').trim()
      if (!last && !first) return (a.email ?? '').trim()
      if (!last) return first
      if (!first) return last
      const initials = formatAuthorInitials(first)
      if (!initials) return last
      return `${last}, ${initials}`
    })
    .filter(Boolean)
    .join(' · ')
}

/** "Feb 2026" via datePublished toLocaleDateString month short year */
export function formatRepositoryDate(date: Date | string | null | undefined): string {
  const d = date ? new Date(date) : new Date()
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date()
    return fallback.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** "Published Feb 2026" label */
export function formatPublishedLabel(date?: Date | string | null): string {
  return `Published ${formatRepositoryDate(date)}`
}
