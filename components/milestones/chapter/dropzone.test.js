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

  test('Browse Files button uses the Figma gradient + drop shadow', () => {
    expect(src).toMatch(/drop-shadow-\[0px_4px_6px_rgba\(112,125,255,0\.21\)\]/)
    expect(src).toMatch(/px-\[20px\] py-\[9px\]/)
    expect(src).toMatch(/linear-gradient\(165deg, #707dff 0%, #5565ff 100%\)/)
  })

  test('uploaded (draft) row is horizontal with Figma metrics', () => {
    expect(src).toMatch(/flex items-center gap-\[11px\]/)
    expect(src).toMatch(/px-\[14px\] py-\[12px\]/)
    expect(src).toMatch(/rounded-\[10px\]/)
    expect(src).toMatch(/bg-\[#f8f9ff\]/)
    expect(src).toMatch(/border-\[rgba\(112,125,255,0\.13\)\]/)
  })

  test('uploaded icon box has the bordered indigo tint', () => {
    expect(src).toMatch(/size-\[36px\]/)
    expect(src).toMatch(/rounded-\[9px\]/)
    expect(src).toMatch(/bg-\[rgba\(112,125,255,0\.07\)\]/)
    expect(src).toMatch(/border-\[rgba\(112,125,255,0\.14\)\]/)
  })

  test('uploaded row shows filename + PDF size meta line', () => {
    expect(src).toMatch(/PDF · \{formatSize\(draft\.size\)\}/)
    expect(src).toMatch(/text-\[#1e3a8a\]/)
    expect(src).toMatch(/text-\[11px\] leading-\[16\.5px\] text-\[#9ea8c6\]/)
  })

  test('buttons appear in Submit -> Replace -> Remove order', () => {
    const draftStart = src.indexOf(') : draft ? (')
    const idleStart = src.indexOf('role="button"')
    const draftBlock = src.slice(draftStart, idleStart)
    const submitted = draftBlock.indexOf('Submit')
    const replaced = draftBlock.indexOf('Replace')
    const removed = draftBlock.indexOf('Remove')
    expect(submitted).toBeGreaterThan(-1)
    expect(replaced).toBeGreaterThan(-1)
    expect(removed).toBeGreaterThan(-1)
    expect(submitted).toBeLessThan(replaced)
    expect(replaced).toBeLessThan(removed)
  })

  test('Submit button uses the Figma gradient + border + shadow', () => {
    expect(src).toMatch(/border-\[rgba\(112,125,255,0\.6\)\]/)
    expect(src).toMatch(/drop-shadow-\[0px_3px_4px_rgba\(112,125,255,0\.2\)\]/)
    expect(src).toMatch(/px-\[18px\] py-\[8px\]/)
    expect(src).toMatch(/linear-gradient\(159deg, #707dff 0%, #5565ff 100%\)/)
  })

  test('Replace button uses the Figma neutral treatment', () => {
    expect(src).toMatch(/bg-\[#f0f2fa\]/)
    expect(src).toMatch(/border-\[#e0e3f0\]/)
    expect(src).toMatch(/px-\[16px\] py-\[8px\]/)
    expect(src).toMatch(/text-\[#5a6382\]/)
  })

  test('Remove uses the Figma red treatment', () => {
    expect(src).toMatch(/text-\[#ef4444\]/)
    expect(src).toMatch(/gap-\[5px\] p-\[5px\]/)
  })

  test('helper note matches the Figma uploaded-state copy', () => {
    expect(src).toMatch(/This document has not been submitted yet\. Submit it when you're ready to send it to your adviser for review\./)
    expect(src).toMatch(/text-\[11\.5px\] leading-\[18\.4px\] text-\[#9ea8c6\]/)
  })
})