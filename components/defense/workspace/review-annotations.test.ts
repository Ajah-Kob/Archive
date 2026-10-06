import { describe, expect, test } from '@jest/globals'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import {
  collectReviewAuthors,
  fingerprintAnnotations,
} from '@/components/defense/workspace/review-annotations'

/**
 * The workspace derives its first-paint reviewer from these names, and
 * DefenseCommentsPanel derives its dropdown from the same rule. If the two ever
 * disagree the document would filter to a reviewer the dropdown does not list.
 * These cases pin the rule, especially the 'Unknown' fallback and the
 * non-review allowlist, which both affect who is treated as a reviewer at all.
 */
function item(type: PdfAnnotationSubtype, author?: string) {
  return {
    annotation: {
      id: `${type}-${author ?? 'none'}`,
      type,
      author,
    },
  }
}

describe('collectReviewAuthors', () => {
  test('returns distinct authors sorted alphabetically', () => {
    const authors = collectReviewAuthors([
      item(PdfAnnotationSubtype.HIGHLIGHT, 'Zara Santos'),
      item(PdfAnnotationSubtype.TEXT, 'Aaron Cruz'),
      item(PdfAnnotationSubtype.INK, 'Zara Santos'),
      item(PdfAnnotationSubtype.FREETEXT, 'Maria Lopez'),
    ])

    expect(authors).toEqual(['Aaron Cruz', 'Maria Lopez', 'Zara Santos'])
  })

  test('reads the author from item.annotation, not the wrapper', () => {
    // A regression here would silently yield ['Unknown'] for every document,
    // leaving the document filtered to a reviewer nobody is.
    const authors = collectReviewAuthors([
      { annotation: { id: 'a', type: PdfAnnotationSubtype.HIGHLIGHT, author: 'Aaron Cruz' } },
    ])

    expect(authors).toEqual(['Aaron Cruz'])
  })

  test('ignores native PDF annotations that are not reviewer feedback', () => {
    // Links/squares load into the store but are not review annotations, so their
    // author must not become a selectable reviewer.
    const authors = collectReviewAuthors([
      item(PdfAnnotationSubtype.HIGHLIGHT, 'Aaron Cruz'),
      { annotation: { id: 'link', type: PdfAnnotationSubtype.LINK, author: 'Some PDF Vendor' } },
    ])

    expect(authors).toEqual(['Aaron Cruz'])
  })

  test('falls back to Unknown when an annotation has no author', () => {
    const authors = collectReviewAuthors([
      item(PdfAnnotationSubtype.HIGHLIGHT, 'Aaron Cruz'),
      item(PdfAnnotationSubtype.HIGHLIGHT),
      item(PdfAnnotationSubtype.TEXT, '   '),
    ])

    // Matches DefenseCommentsPanel, which does `author?.trim() || 'Unknown'`.
    expect(authors).toEqual(['Aaron Cruz', 'Unknown'])
  })

  test('trims surrounding whitespace so one reviewer is not listed twice', () => {
    const authors = collectReviewAuthors([
      item(PdfAnnotationSubtype.HIGHLIGHT, '  Aaron Cruz  '),
      item(PdfAnnotationSubtype.TEXT, 'Aaron Cruz'),
    ])

    expect(authors).toEqual(['Aaron Cruz'])
  })

  test('returns an empty list for missing, empty, or malformed input', () => {
    expect(collectReviewAuthors(null)).toEqual([])
    expect(collectReviewAuthors(undefined)).toEqual([])
    expect(collectReviewAuthors([])).toEqual([])
    expect(collectReviewAuthors([null, {}, { annotation: null }])).toEqual([])
  })

  test('returns an empty list when only native annotations are present', () => {
    expect(
      collectReviewAuthors([
        { annotation: { id: 's', type: PdfAnnotationSubtype.SQUARE, author: 'Vendor' } },
      ]),
    ).toEqual([])
  })
})

/**
 * Change detection: the Save button is enabled when the CURRENT annotation state
 * differs from the LAST SAVED state. These pin the four cases the requirement
 * calls out, with the delete-the-last-annotation case first because it is the one
 * an event-based flag or a `length > 0` check gets wrong.
 */
function ann(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    type: PdfAnnotationSubtype.HIGHLIGHT,
    author: 'Panelist',
    contents: '',
    color: '#ffd54a',
    opacity: 1,
    rect: { x: 10, y: 20, width: 100, height: 12 },
    segmentRects: [{ x: 10, y: 20, width: 100, height: 12 }],
    ...overrides,
  }
}

const dirty = (saved: unknown[], current: unknown[]) =>
  fingerprintAnnotations(current as Record<string, unknown>[]) !==
  fingerprintAnnotations(saved as Record<string, unknown>[])

describe('fingerprintAnnotations — change detection', () => {
  test('saved 1, current 1 unchanged -> clean', () => {
    expect(dirty([ann('a')], [ann('a')])).toBe(false)
  })

  test('saved 1, current 2 -> dirty (addition)', () => {
    expect(dirty([ann('a')], [ann('a'), ann('b')])).toBe(true)
  })

  // The scenario from the requirement: delete the only annotation.
  test('saved 1, current 0 -> dirty (deletion of the last annotation)', () => {
    expect(dirty([ann('a')], [])).toBe(true)
  })

  test('saved 0, current 0 -> clean', () => {
    expect(dirty([], [])).toBe(false)
  })

  test('saved 0, current 1 -> dirty', () => {
    expect(dirty([], [ann('a')])).toBe(true)
  })

  test('a text edit is dirty', () => {
    expect(dirty([ann('a')], [ann('a', { contents: 'revised' })])).toBe(true)
  })

  test('a move is dirty', () => {
    expect(
      dirty(
        [ann('a')],
        [
          ann('a', {
            rect: { x: 999, y: 20, width: 100, height: 12 },
            segmentRects: [{ x: 999, y: 20, width: 100, height: 12 }],
          }),
        ],
      ),
    ).toBe(true)
  })

  test('a resize is dirty', () => {
    expect(
      dirty(
        [ann('a')],
        [
          ann('a', {
            rect: { x: 10, y: 20, width: 140, height: 12 },
            segmentRects: [{ x: 10, y: 20, width: 140, height: 12 }],
          }),
        ],
      ),
    ).toBe(true)
  })

  test('a colour change is dirty', () => {
    expect(dirty([ann('a')], [ann('a', { color: '#ff0000' })])).toBe(true)
  })

  test('deleting then restoring the same annotation is clean again', () => {
    // The property an event flag cannot provide.
    const saved = [ann('a')]
    expect(dirty(saved, [])).toBe(true)
    expect(dirty(saved, [ann('a')])).toBe(false)
  })

  test('ignores ordering', () => {
    expect(fingerprintAnnotations([ann('a'), ann('b')])).toBe(
      fingerprintAnnotations([ann('b'), ann('a')]),
    )
  })

  test('ignores float noise below two decimals', () => {
    expect(
      dirty(
        [ann('a')],
        [
          ann('a', {
            rect: { x: 10.0001, y: 20, width: 100, height: 12 },
            segmentRects: [{ x: 10.0001, y: 20, width: 100, height: 12 }],
          }),
        ],
      ),
    ).toBe(false)
  })

  test('ignores native PDF annotations, which are never reviewer feedback', () => {
    expect(
      dirty(
        [ann('a')],
        [ann('a'), ann('link', { type: PdfAnnotationSubtype.LINK })],
      ),
    ).toBe(false)
  })

  test('an empty set fingerprints to the empty string', () => {
    expect(fingerprintAnnotations([])).toBe('')
  })
})