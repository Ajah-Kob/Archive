/**
 * Source-level regression tests for W2-T3 (SubmissionHistory.tsx +
 * SubmissionVersionRow.tsx).
 *
 * Mirrors the repo's jest style: the module is read from disk because jest
 * has no JSX/Babel transform configured here.
 */
const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'SubmissionHistory.tsx')
const src = fs.readFileSync(file, 'utf8')

describe('W2-T3 SubmissionHistory', () => {
  test('plain header, no icon box, no count pill', () => {
    expect(src).toMatch(/font-sora text-\[12\.5px\] font-semibold text-\[#1e3a8a\]/)
    expect(src).toMatch(/Submission History/)
    expect(src).not.toMatch(/Submission History[\s\S]*size-\[26px\]/)
  })

  test('empty state follows the Figma spec', () => {
    expect(src).toMatch(/No Submission History/)
    expect(src).toMatch(/Uploaded documents will appear here once you submit a file\./)
    expect(src).toMatch(/text-\[13px\][\s\S]*?text-\[#1e3a8a\]/)
    expect(src).toMatch(/text-\[11\.5px\] text-\[#9ea8c6\]/)
  })
})

describe('W2-T3 SubmissionVersionRow', () => {
  test('version label is plain text, no v-chip', () => {
    expect(src).toMatch(/Version \{version\.version\}/)
    expect(src).toMatch(/font-sora text-\[13px\] font-semibold text-\[#1e3a8a\]/)
  })

  test('no filename row', () => {
    expect(src).not.toMatch(/version\.fileName/)
  })

  test('View button follows the Figma spec', () => {
    expect(src).toMatch(/h-\[32px\] w-\[74px\]/)
    expect(src).toMatch(/bg-\[#f0f2fa\]/)
    expect(src).toMatch(/border-\[#e0e3f0\]/)
    expect(src).toMatch(/rounded-\[8px\]/)
  })

  test('circle + connector follow the Figma spec', () => {
    expect(src).toMatch(/size-\[15px\] rounded-\[25px\] border-2/)
    expect(src).toMatch(/rounded-\[50%\]/)
    expect(src).toMatch(/w-\[2px\]/)
    expect(src).toMatch(/bg-\[#e8ebf8\]/)
  })

  test('status pill is text-only with Figma metrics', () => {
    expect(src).toMatch(/rounded-\[7px\] px-\[9px\] py-\[2px\] text-\[11px\] font-bold/)
  })

  test('date + review line use the Figma palette', () => {
    expect(src).toMatch(/text-\[12px\] text-\[#6b7399\]/)
    expect(src).toMatch(/text-\[12px\] text-\[#9ea8c6\]/)
  })
})
