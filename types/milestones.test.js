const { readFileSync } = require('fs')
const { join } = require('path')

const SRC = join(__dirname, 'milestones.ts')
const src = readFileSync(SRC, 'utf8')

describe('types/milestones.ts — chapter submission types', () => {
  test('defines ChapterKey union with all five chapters', () => {
    expect(src).toMatch(/export type ChapterKey =\s*\| 'CHAPTER_1'\s*\| 'CHAPTER_2'\s*\| 'CHAPTER_3'\s*\| 'CHAPTER_4'\s*\| 'CHAPTER_5'/)
  })

  test('SLUG_TO_CHAPTER maps chapter-1..5', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      expect(src).toMatch(new RegExp(`'chapter-${n}': 'CHAPTER_${n}'`))
    }
  })

  test('CHAPTER_LABELS covers all keys', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      expect(src).toMatch(new RegExp(`CHAPTER_${n}: 'Chapter ${n}'`))
    }
  })

  test('CHAPTER_PHASE assigns CAPSTONE 1 to chapters 1-3 and CAPSTONE 2 to 4-5', () => {
    for (const n of [1, 2, 3]) {
      expect(src).toMatch(new RegExp(`CHAPTER_${n}: 'CAPSTONE 1'`))
    }
    for (const n of [4, 5]) {
      expect(src).toMatch(new RegExp(`CHAPTER_${n}: 'CAPSTONE 2'`))
    }
  })

  test('ChapterViewState includes the four view states', () => {
    expect(src).toMatch(/export type ChapterViewState =\s*\| 'DEFAULT'\s*\| 'IN_REVIEW'\s*\| 'NEEDS_REVISION'\s*\| 'APPROVED'/)
  })

  test('SubmissionViewStatus includes SUPERSEDED', () => {
    expect(src).toMatch(/export type SubmissionViewStatus =\s*\| 'IN_REVIEW'\s*\| 'NEEDS_REVISION'\s*\| 'APPROVED'\s*\| 'SUPERSEDED'/)
  })

  test('ChapterVersionItem carries review + version fields', () => {
    for (const field of [
      'id', 'version', 'fileName', 'blobUrl', 'mimeType', 'size', 'status',
      'submittedBy', 'submittedAt', 'reviewedAt', 'reviewNote', 'isCurrent', 'commentCount',
    ]) {
      expect(src).toMatch(new RegExp(`${field}:`))
    }
  })

  test('ChapterSubmissionPayload carries chapter, open, current, history, state', () => {
    for (const field of ['chapter', 'open', 'milestoneId', 'current', 'history', 'state', 'canSubmit', 'requiresCapstone', 'journey']) {
      expect(src).toMatch(new RegExp(`^  ${field}:`, 'm'))
    }
  })
})
