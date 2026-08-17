/**
 * Source-level regression tests for W2-T2 (UploadDropzone.tsx).
 *
 * Mirrors the repo's jest style: the module is read from disk because jest
 * has no JSX/Babel transform configured here.
 */
const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'UploadDropzone.tsx')
const src = fs.readFileSync(file, 'utf8')

describe('W2-T2 UploadDropzone', () => {
  test('header icon box follows the Figma spec', () => {
    expect(src).toMatch(/size-\[26px\]/)
    expect(src).toMatch(/rounded-\[7px\]/)
    expect(src).toMatch(/bg-\[rgba\(112,125,255,0\.05\)\]/)
  })

  test('idle dropzone follows the Figma spec', () => {
    expect(src).toMatch(/border-2 border-dashed/)
    expect(src).toMatch(/border-\[#d0d5ea\]/)
    expect(src).toMatch(/bg-\[#fafbff\]/)
    expect(src).toMatch(/rounded-\[12px\]/)
    expect(src).toMatch(/px-\[30px\] py-\[22px\]/)
    expect(src).toMatch(/size-\[48px\]/)
    expect(src).toMatch(/rounded-\[24px\]/)
    expect(src).toMatch(/bg-\[#eef0fb\]/)
  })

  test('enforces the 20 MB PDF Figma copy', () => {
    expect(src).toMatch(/PDF only · Maximum file size: 20 MB/)
    expect(src).toMatch(/text-\[11px\] text-\[#bbc0d8\]/)
  })

  test('accepts only PDF files', () => {
    expect(src).toMatch(/accept="application\/pdf"/)
  })
})
