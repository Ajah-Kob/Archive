/**
 * Annotation serialization helpers for EmbedPDF.
 *
 * `exportAnnotations()` returns `AnnotationTransferItem[]`. Most items are
 * plain JSON-safe objects, but stamps carry `ctx.data` as an `ArrayBuffer`,
 * which does not survive `JSON.stringify` (see .agents/skills/embedpdf rule 3).
 * These helpers base64-encode stamp data before persisting to Prisma `Json`
 * and decode it back to `ArrayBuffer` before `importAnnotations()`.
 *
 * Pure functions — no side effects, no server/client dependencies. Consumers
 * add `'use client'` where the module is used in a client boundary.
 */

/**
 * Structural type for EmbedPDF's `AnnotationTransferItem`, mirroring the shape
 * used by `exportAnnotations()` / `importAnnotations()`. Deliberately does NOT
 * carry a top-level index signature so the real `AnnotationTransferItem` from
 * `@embedpdf/plugin-annotation` (which has none) is assignable to it — the
 * plugin's items flow straight into `serializeAnnotations`.
 */
export interface AnnotationTransferItem {
  annotation: unknown
  ctx?: {
    data?: ArrayBuffer | string
    [key: string]: unknown
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

// For DB: stamps -> { data: base64 string } ; everything else unchanged.
// Spreads the whole item so non-stamp items (and any extra top-level fields)
// pass through untouched; only ctx.data is transformed.
export function serializeAnnotations(items: AnnotationTransferItem[]): unknown[] {
  return items.map((item) => ({
    ...item,
    ...(item.ctx?.data
      ? { ctx: { ...item.ctx, data: bufferToBase64(item.ctx.data as ArrayBuffer) } }
      : {}),
  }))
}

// For importAnnotations(): restore ArrayBuffers from base64.
export function deserializeAnnotations(saved: unknown[]): AnnotationTransferItem[] {
  return saved.map((item) => {
    const it = item as AnnotationTransferItem
    if (it.ctx?.data && typeof it.ctx.data === 'string') {
      return { ...it, ctx: { ...it.ctx, data: base64ToBuffer(it.ctx.data as string) } }
    }
    return it
  })
}