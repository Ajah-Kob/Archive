/**
 * Source-level regression tests for W2-T1 (StatusCallout.tsx).
 *
 * Mirrors the repo's jest style (types/milestones.test.js): the module is read
 * from disk because jest has no JSX/Babel transform configured here.
 */
const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'StatusCallout.tsx')
const src = fs.readFileSync(file, 'utf8')

describe('W2-T1 StatusCallout', () => {
  test('renders the horizontal strip with Figma metrics', () => {
    expect(src).toMatch(/px-\[22px\]/)
    expect(src).toMatch(/py-\[18px\]/)
    expect(src).toMatch(/gap-\[16px\]/)
    expect(src).toMatch(/rounded-\[14px\]/)
    expect(src).toMatch(/size-\[40px\]/)
    expect(src).toMatch(/rounded-\[12px\]/)
  })

  test('headline uses Sora 15px with state color', () => {
    expect(src).toMatch(/font-sora text-\[15px\] font-semibold/)
  })

  test('context copy is 13px #5a6382', () => {
    expect(src).toMatch(/text-\[13px\] text-\[#5a6382\]/)
  })

  test('state palette covers all four view states', () => {
    for (const state of ['DEFAULT', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED']) {
      expect(src).toMatch(new RegExp(`${state}:`))
    }
  })

  test('accepts a ChapterViewState prop (always rendered, state-driven)', () => {
    expect(src).toMatch(/state: ChapterViewState/)
  })

  test('red review-feedback button follows the Figma spec', () => {
    expect(src).toMatch(/bg-\[#e11d48\]/)
    expect(src).toMatch(/border-\[rgba\(225,29,72,0\.4\)\]/)
    expect(src).toMatch(/rounded-\[9px\]/)
  })
})