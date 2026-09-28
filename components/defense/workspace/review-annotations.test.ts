import { describe, expect, test } from '@jest/globals'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import { collectReviewAuthors } from '@/components/defense/workspace/review-annotations'

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
