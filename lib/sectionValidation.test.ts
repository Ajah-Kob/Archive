import { describe, expect, test } from '@jest/globals'
import {
  DUPLICATE_SECTION_MESSAGE,
  normalizeSectionKey,
  parseAcademicYear,
  parseGlobalSectionName,
} from './sectionValidation'

describe('lib/sectionValidation', () => {
  test('normalizes section names for duplicate checks', () => {
    expect(normalizeSectionKey('  BSIS   1A ')).toBe('bsis 1a')
    expect(normalizeSectionKey('bsis 1a')).toBe('bsis 1a')
  })

  test('validates section display names', () => {
    expect(parseGlobalSectionName('  BSIS   1A ')).toBe('BSIS 1A')
    expect(parseGlobalSectionName('ab')).toEqual({
      error: 'Section name must be between 3 and 60 characters.',
    })
  })

  test('requires a supported academic year', () => {
    expect(parseAcademicYear('')).toEqual({
      error: 'Academic year is required.',
    })
    expect(parseAcademicYear('2026-2028')).toEqual({
      error: 'Invalid academic year.',
    })
  })

  test('uses the exact duplicate copy', () => {
    expect(DUPLICATE_SECTION_MESSAGE).toBe(
      'This name is taken by an active section.',
    )
  })
})
