// Pure academic-year helpers for the shared section form.
//
// Provisional rule: the academic year flips in August (0-indexed month 7),
// so September 2026 belongs to 2026-2027. There is no user-facing settings
// page yet — the boundary is a constant, not a stored setting.
//
// The window mirrors the server validation in lib/actions/sections.ts:
// previous year + current year + next 10 years (12 options total), each
// `YYYY-YYYY`. Keep this file dependency-free so both client components and
// server actions can share the same pure logic without importing UI code.

export const ACADEMIC_YEAR_START_MONTH = 7

export const ACADEMIC_YEAR_OPTION_COUNT = 12

export const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/

// Starting calendar year for the academic year containing `date`.
// August (month index 7) or later belongs to the year that just started;
// January–July still belongs to the year that started last August.
export function academicYearStartFor(date: Date): number {
  const month = date.getMonth()
  const year = date.getFullYear()
  return month >= ACADEMIC_YEAR_START_MONTH ? year : year - 1
}

// Exactly 12 options: previous year, current year, and the next 10 years.
export function getSupportedAcademicYears(now: Date = new Date()): string[] {
  const currentStart = academicYearStartFor(now)
  return Array.from({ length: ACADEMIC_YEAR_OPTION_COUNT }, (_, i) => {
    const start = currentStart - 1 + i
    return `${start}-${start + 1}`
  })
}

// Default dropdown value: the current academic year (e.g. 2026-2027).
export function getDefaultAcademicYear(now: Date = new Date()): string {
  const start = academicYearStartFor(now)
  return `${start}-${start + 1}`
}

// Display-shape check plus window membership (`YYYY-YYYY`, consecutive
// years, inside the 12-option window). Pure — no settings lookup.
export function isSupportedAcademicYear(
  value: unknown,
  now: Date = new Date(),
): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  const match = ACADEMIC_YEAR_PATTERN.exec(trimmed)
  if (!match) return false
  const start = Number(match[1])
  const end = Number(match[2])
  if (end !== start + 1) return false
  return getSupportedAcademicYears(now).includes(trimmed)
}
