import { describe, expect, test } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Structural guardrail for explicit-save semantics: annotations persist ONLY
 * through the explicit Save flow (toolbar Save, Save-and-leave,
 * Discard-and-leave). The debounced auto-save that used to live in this module
 * is gone on purpose, and this test fails loudly if anyone reintroduces a
 * write path here — e.g. by re-adding the action import for a "quick"
 * background persist.
 *
 * This is a source check rather than a behavioral test because there is no
 * component-render infrastructure in this repo (no testing-library/jsdom; the
 * only component-adjacent suite is the pure-function review-annotations one).
 * The behavioral half — dirty tracking itself — is covered there.
 */
function moduleSource(): string {
  const source = readFileSync(join(__dirname, 'useAnnotationDraft.ts'), 'utf8')
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
}

describe('useAnnotationDraft — no implicit persistence', () => {
  test('the module references no annotation write action', () => {
    const source = moduleSource()
    expect(source).not.toMatch('saveDefenseAnnotationDraft')
  })

  test('the module has no timer-based background flush', () => {
    const source = moduleSource()
    expect(source).not.toMatch('setTimeout')
    expect(source).not.toMatch('flushSave')
    expect(source).not.toMatch('DEBOUNCE_MS')
  })

  test('the module exposes no save-status state to key UI off', () => {
    const source = moduleSource()
    expect(source).not.toMatch('AnnotationDraftStatus')
  })
})
