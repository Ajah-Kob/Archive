// Pure section identity helpers shared by server actions and tests.
//
// Normalization must match the staged database backstop
// (Section_active_section_academicYear_key) and preflight.sql:
// trim + collapse internal whitespace + lowercase.
import { isSupportedAcademicYear } from '@/lib/academicYear'

// Exact application copy for active duplicates.
export const DUPLICATE_SECTION_MESSAGE =
  'This name is taken by an active section.'

// Display value: trim + collapse internal runs, preserve case.
export function parseGlobalSectionName(
  raw: unknown,
): string | { error: string } {
  const text = typeof raw === 'string' ? raw : ''
  const collapsed = text.trim().replace(/\s+/g, ' ')
  if (collapsed.length < 3 || collapsed.length > 60) {
    return { error: 'Section name must be between 3 and 60 characters.' }
  }
  return collapsed
}

// Duplicate key: display normalization + lowercase (matches DB expression).
export function normalizeSectionKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function parseAcademicYear(raw: unknown): string | { error: string } {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) {
    return { error: 'Academic year is required.' }
  }
  if (!isSupportedAcademicYear(value)) {
    return { error: 'Invalid academic year.' }
  }
  return value
}
