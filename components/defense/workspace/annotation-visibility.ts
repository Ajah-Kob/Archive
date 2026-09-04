/**
 * Pure helpers for defense annotation visibility (student show/hide).
 *
 * Visibility is stored as `isVisible` boolean on the AnnotationTransferItem JSON
 * inside DefenseSubmissionAnnotation.data (per-annotation, top-level). Missing
 * flag means visible (default true). Panelist filtering uses isVisible===false
 * to exclude hidden annotations.
 */

/** Extracts the annotation id from a transfer item wrapper or raw annotation. */
export function getAnnotationId(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null
  const obj = item as { annotation?: { id?: unknown }; id?: unknown }
  // Wrapper { annotation: { id } } or raw { id }
  const nested = obj.annotation?.id
  if (typeof nested === 'string' && nested.length > 0) return nested
  if (typeof obj.id === 'string' && obj.id.length > 0) return obj.id
  return null
}

/** Whether a transfer item is visible to the panelist (default true). */
export function isAnnotationVisible(item: unknown): boolean {
  if (!item || typeof item !== 'object') return true
  const visible = (item as { isVisible?: unknown }).isVisible
  return visible !== false
}

/** Builds a Map from annotationId → isVisible from serialized transfer items. */
export function buildVisibilityMap(
  items: unknown[] | null | undefined,
): Map<string, boolean> {
  const map = new Map<string, boolean>()
  if (!Array.isArray(items)) return map
  for (const item of items) {
    const id = getAnnotationId(item)
    if (!id) continue
    map.set(id, isAnnotationVisible(item))
  }
  return map
}

/** Resolves display visibility: optimistic override → persisted map → default true. */
export function resolveVisibility(
  annotationId: string,
  optimistic: Map<string, boolean>,
  persisted: Map<string, boolean>,
): boolean {
  if (optimistic.has(annotationId)) return optimistic.get(annotationId) as boolean
  if (persisted.has(annotationId)) return persisted.get(annotationId) as boolean
  return true
}
