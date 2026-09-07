import type { AuthorEntry } from '@/lib/archiving/validation'

/**
 * Splits a full name into firstName / lastName.
 * Bridge for legacy User.name single field (firstName + lastName not yet migrated).
 *
 * - Trims and splits on whitespace.
 * - Single token → { firstName: token, lastName: "" } (caller validates required).
 * - Multi token → firstName = all but last, lastName = last token.
 *   e.g. "Juan Dela Cruz" → firstName "Juan Dela", lastName "Cruz"
 *   e.g. "John Michael Doe" → firstName "John Michael", lastName "Doe"
 *
 * Lossy for compound last names / middle names — acceptable until migration.
 * Keep in sync with docs/archived/plans/first-last-name-migration.md
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = (fullName ?? '').trim()
  if (trimmed.length === 0) return { firstName: '', lastName: '' }
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1] ?? '',
  }
}

/** Normalizes an email for duplicate checks: trimmed, lowercased. */
export function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase()
}

/** Normalizes a name part for duplicate checks: trimmed, lowercased. */
export function normalizeNamePart(value: string): string {
  return (value ?? '').trim().toLowerCase()
}

/** Returns a composite key for name duplicate detection: "firstname|lastname" lowercased. */
export function authorNameKey(author: AuthorEntry): string {
  return `${normalizeNamePart(author.firstName)}|${normalizeNamePart(author.lastName)}`
}

/** Returns email key for duplicate detection. */
export function authorEmailKey(author: AuthorEntry): string {
  return normalizeEmail(author.email)
}

/**
 * Checks whether `candidate` duplicates any entry in `existing`.
 * Duplicate if:
 * - same userId (both non-null, equal) OR
 * - same email (case-insensitive) OR
 * - same normalized first+last name pair
 * Used to block adding a picked student that is already an author,
 * preserving linked vs custom distinction (userId null = custom).
 */
export function isDuplicateAuthorEntry(
  existing: AuthorEntry[],
  candidate: AuthorEntry,
): boolean {
  const candEmail = authorEmailKey(candidate)
  const candName = authorNameKey(candidate)
  const candUserId = candidate.userId

  return existing.some((entry) => {
    // userId match wins (linked author)
    if (candUserId != null && entry.userId != null && candUserId === entry.userId) {
      return true
    }
    if (candEmail && authorEmailKey(entry) === candEmail) return true
    if (candName && authorNameKey(entry) === candName) return true
    return false
  })
}

/**
 * Returns true if the author list contains any duplicates
 * (by email OR by name, case-insensitive, plus userId).
 * Mirrors validation.ts hasDuplicateAuthors but also checks userId.
 */
export function hasDuplicateAuthors(authors: AuthorEntry[]): boolean {
  if (!Array.isArray(authors) || authors.length < 2) return false

  const emails = authors.map(authorEmailKey).filter(Boolean)
  if (new Set(emails).size !== emails.length) return true

  const names = authors.map(authorNameKey).filter((k) => k !== '|')
  if (new Set(names).size !== names.length) return true

  const userIds = authors
    .map((a) => a.userId)
    .filter((id): id is number => typeof id === 'number' && id != null)
  if (new Set(userIds).size !== userIds.length) return true

  return false
}

/**
 * Creates an AuthorEntry from a group member user record.
 * Uses splitName to bridge single User.name → first/last.
 */
export function authorFromMember(member: {
  userId: number
  name: string
  email: string
}): AuthorEntry {
  const { firstName, lastName } = splitName(member.name ?? '')
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: member.userId,
    firstName,
    lastName,
    email: member.email ?? '',
  }
}

/**
 * Moves an element in an array immutably.
 * Used for drag reorder and up/down buttons.
 */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  if (from === to) return [...array]
  if (from < 0 || from >= array.length) return [...array]
  if (to < 0 || to >= array.length) return [...array]
  const copy = [...array]
  const [moved] = copy.splice(from, 1)
  copy.splice(to, 0, moved as T)
  return copy
}

/** Normalizes a tag for duplicate check (trim + lower). */
export function normalizeTag(tag: string): string {
  return (tag ?? '').trim().toLowerCase()
}

/** True if tags contain a duplicate case-insensitive. */
export function hasDuplicateTags(tags: string[]): boolean {
  const normalized = tags.map(normalizeTag).filter(Boolean)
  return new Set(normalized).size !== normalized.length
}
