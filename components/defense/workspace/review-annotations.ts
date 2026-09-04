import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { PdfAnnotationObject, Rect } from '@embedpdf/models'

/**
 * The annotation subtypes that make up Archive's review vocabulary — exactly
 * the five workspace tools (see AnnotationToolbar).
 *
 * PDFs carry NATIVE annotations that are part of the document itself, not
 * reviewer feedback: hyperlinks are /Link annotations (References sections
 * are full of them), Word exports add squares/lines, etc. The EmbedPDF engine
 * loads all native annotations into its store, so every review pipeline
 * boundary (persistence, comment list, hover/hit-testing, verdict export)
 * must filter to this allowlist. Native annotations stay in the store — they
 * keep rendering and stay clickable — they are simply never treated as
 * reviewer feedback.
 */
export const REVIEW_ANNOTATION_TYPES: ReadonlySet<PdfAnnotationSubtype> =
  new Set([
    PdfAnnotationSubtype.HIGHLIGHT,
    PdfAnnotationSubtype.TEXT,
    PdfAnnotationSubtype.INK,
    PdfAnnotationSubtype.FREETEXT,
    PdfAnnotationSubtype.STRIKEOUT,
  ])

/** Whether an annotation object is a reviewer-created review annotation. */
export function isReviewAnnotation(
  annotation: Pick<PdfAnnotationObject, 'type'>,
): boolean {
  return REVIEW_ANNOTATION_TYPES.has(annotation.type)
}

/**
 * Text-markup subtypes (inline annotations). Their true geometry is the
 * per-fragment `segmentRects` array — one quad per annotated text fragment,
 * one fragment per line — NOT the union `/Rect`, which spans every
 * fragment's extremes and therefore includes unannotated text between,
 * before, or after the marked ranges.
 */
export const TEXT_MARKUP_TYPES: ReadonlySet<PdfAnnotationSubtype> = new Set([
  PdfAnnotationSubtype.HIGHLIGHT,
  PdfAnnotationSubtype.STRIKEOUT,
  PdfAnnotationSubtype.UNDERLINE,
  PdfAnnotationSubtype.SQUIGGLY,
])

export function isTextMarkupAnnotation(
  annotation: Pick<PdfAnnotationObject, 'type'>,
): boolean {
  return TEXT_MARKUP_TYPES.has(annotation.type)
}

/**
 * The exact page-space rectangles covered by an annotation. Text markup
 * returns its per-fragment quads; every other type is exactly its `/Rect`.
 *
 * Hit-testing, hover borders, drag surfaces, and selection outlines must all
 * use these segments — using the union rect makes unannotated text inside it
 * behave like part of the annotation (hover boxes, move cursor, blocked text
 * selection).
 */
export function getAnnotationSegments(annotation: PdfAnnotationObject): Rect[] {
  if (
    isTextMarkupAnnotation(annotation) &&
    'segmentRects' in annotation &&
    Array.isArray(annotation.segmentRects) &&
    annotation.segmentRects.length > 0
  ) {
    return annotation.segmentRects
  }
  return [annotation.rect]
}
