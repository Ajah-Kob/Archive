import { describe, expect, test } from '@jest/globals'
import {
  ACADEMIC_YEAR_OPTION_COUNT,
  academicYearStartFor,
  getDefaultAcademicYear,
  getSupportedAcademicYears,
  isSupportedAcademicYear,
} from './academicYear'

describe('lib/academicYear', () => {
  test('uses an August boundary for the academic year', () => {
    expect(academicYearStartFor(new Date(2026, 7, 1))).toBe(2026)
    expect(academicYearStartFor(new Date(2026, 6, 31))).toBe(2025)
  })

  test('returns previous, current, and next 10 years', () => {
    const options = getSupportedAcademicYears(new Date(2026, 8, 25))
    expect(options).toHaveLength(ACADEMIC_YEAR_OPTION_COUNT)
    expect(options[0]).toBe('2025-2026')
    expect(options[1]).toBe('2026-2027')
    expect(options[options.length - 1]).toBe('2036-2037')
  })

  test('defaults to the current academic year', () => {
    expect(getDefaultAcademicYear(new Date(2026, 8, 25))).toBe('2026-2027')
  })

  test('accepts only consecutive supported academic years', () => {
    const now = new Date(2026, 8, 25)
    expect(isSupportedAcademicYear('2026-2027', now)).toBe(true)
    expect(isSupportedAcademicYear('2026-2028', now)).toBe(false)
    expect(isSupportedAcademicYear('2026', now)).toBe(false)
    expect(isSupportedAcademicYear(' 2026-2027 ', now)).toBe(true)
  })
})
