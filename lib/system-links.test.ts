import { describe, expect, test } from '@jest/globals'
import {
  isAllowedLinkUrl,
  linksAreEditable,
  normalizeLabel,
} from './system-links'

describe('lib/systemLinks', () => {
  test('allows absolute http and https links', () => {
    expect(isAllowedLinkUrl('https://github.com/bsis/archive')).toBe(true)
    expect(isAllowedLinkUrl('http://demo.example.com')).toBe(true)
    expect(isAllowedLinkUrl('  https://figma.com/file/abc  ')).toBe(true)
  })

  test('rejects dangerous schemes', () => {
    expect(isAllowedLinkUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedLinkUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isAllowedLinkUrl('vbscript:msgbox(1)')).toBe(false)
    expect(isAllowedLinkUrl('file:///C:/Windows/System32')).toBe(false)
  })

  test('rejects relative paths and junk', () => {
    expect(isAllowedLinkUrl('/student/milestone')).toBe(false)
    expect(isAllowedLinkUrl('github.com/bsis')).toBe(false)
    expect(isAllowedLinkUrl('')).toBe(false)
    expect(isAllowedLinkUrl('   ')).toBe(false)
  })

  test('derives editability from the verdict', () => {
    expect(linksAreEditable('PENDING')).toBe(true)
    expect(linksAreEditable('MINOR_REVISION')).toBe(false)
    expect(linksAreEditable('MAJOR_REVISION')).toBe(false)
    expect(linksAreEditable('PASSED')).toBe(false)
  })

  test('uses the preset label unless Other is chosen', () => {
    expect(normalizeLabel('GitHub', 'ignored')).toBe('GitHub')
    expect(normalizeLabel('Other', '  My API  ')).toBe('My API')
    expect(normalizeLabel('Other', '   ')).toBe('')
  })
})