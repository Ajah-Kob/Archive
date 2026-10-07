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

/**
 * Distinct reviewer names across a set of serialized annotations, sorted
 * alphabetically — the order the reviewer dropdown lists them in.
 *
 * Mirrors the derivation in DefenseCommentsPanel exactly, including the
 * 'Unknown' fallback for an annotation with no author, so the two can never
 * disagree about who the reviewers are. It reads `item.annotation` because
 * these are `AnnotationTransferItem`s (serialization only rewrites `ctx.data`,
 * so `type` stays a `PdfAnnotationSubtype` and `isReviewAnnotation` applies).
 */
export function collectReviewAuthors(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  const names = new Set<string>()
  for (const item of items) {
    const annotation = (item as { annotation?: unknown } | null)?.annotation
    if (!annotation || typeof annotation !== 'object') continue
    if (!isReviewAnnotation(annotation as Pick<PdfAnnotationObject, 'type'>)) continue
    const raw = (annotation as { author?: unknown }).author
    const author = typeof raw === 'string' ? raw.trim() : ''
    names.add(author || 'Unknown')
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

// ─────────────────────── change detection (last saved vs current) ───────────────────────

/**
 * Geometry is rounded before comparison. Drag and resize produce float noise, and
 * a hairline difference that the panelist cannot see must not flip Save from
 * disabled to enabled.
 */
function roundCoord(n: unknown): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function normalizeRect(rect: unknown): string {
  const r = (rect ?? {}) as Record<string, unknown>
  return [roundCoord(r.x), roundCoord(r.y), roundCoord(r.width), roundCoord(r.height)].join(',')
}

function normalizeSegments(segments: unknown): string {
  if (!Array.isArray(segments)) return ''
  return segments
    .map(normalizeRect)
    .sort()
    .join(';')
}

/**
 * Canonical, order-independent fingerprint of one annotation's persisted meaning.
 *
 * Deliberately an allowlist of semantically meaningful fields rather than a dump
 * of the whole object: the live plugin state and the server-serialized props
 * differ in incidental fields, and comparing those directly would report a
 * permanent difference. Everything a reviewer can actually change is here —
 * identity, type, author, text, colour, opacity and geometry (the union /Rect
 * plus the authoritative per-fragment segmentRects for text markup).
 */
function fingerprintOne(annotation: Record<string, unknown>): string {
  return JSON.stringify([
    annotation.id ?? null,
    annotation.type ?? null,
    annotation.author ?? '',
    annotation.contents ?? '',
    annotation.color ?? null,
    annotation.opacity ?? null,
    normalizeRect(annotation.rect),
    normalizeSegments(annotation.segmentRects),
  ])
}

/**
 * Fingerprint a set of annotations for change detection.
 *
 * Returns '' for an empty set, which is a meaningful value: 'was 1, now 0' is a
 * deletion and must compare unequal to the saved fingerprint.
 */
export function fingerprintAnnotations(
  annotations: Iterable<Record<string, unknown>>,
): string {
  const rows: string[] = []
  for (const annotation of annotations) {
    if (!annotation) continue
    if (!isReviewAnnotation(annotation as Pick<PdfAnnotationObject, 'type'>)) continue
    rows.push(fingerprintOne(annotation))
  }
  rows.sort()
  return rows.join('||')
}
