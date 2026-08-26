'use client'

import { useEffect } from 'react'
import { useRegistry } from '@embedpdf/core/react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import type { PdfAnnotationObject } from '@embedpdf/models'

interface AnnotationDedupeProps {
  /** Active document id — its annotation store is reconciled. */
  documentId: string
}

/**
 * Permanent guard against duplicate annotation uids in the annotation store.
 *
 * The annotation reducer is NOT idempotent: `CREATE_ANNOTATION` unconditionally
 * appends a uid to `pages[pageIndex]`, and the plugin loads annotations from
 * the engine document on every `onDocumentLoaded` — so the same annotation can
 * end up in the store twice (engine load + hydration import, or a remount that
 * re-imports while the registry survives). Duplicate uids make AnnotationLayer
 * render two children with the same React key.
 *
 * This component watches the annotation state and, whenever it detects a page
 * whose uid list contains duplicates, dispatches the plugin's
 * `SET_ANNOTATIONS` action with a deduped list — healing the store in place.
 * It is idempotent: it only acts when duplicates actually exist, so it is safe
 * to run on every state change.
 *
 * Renders nothing — a behavior-only component living inside the EmbedPDF tree.
 */
export function AnnotationDedupe({ documentId }: AnnotationDedupeProps) {
  const { registry } = useRegistry()
  const { state } = useAnnotation(documentId)

  useEffect(() => {
    // No-op unless a page actually has duplicate uids.
    let hasDuplicates = false
    for (const uids of Object.values(state.pages)) {
      if (new Set(uids).size !== uids.length) {
        hasDuplicates = true
        break
      }
    }
    if (!hasDuplicates) return

    // Rebuild a deduped pages structure (first occurrence wins).
    const annotations: Record<number, PdfAnnotationObject[]> = {}
    for (const [pageKey, uids] of Object.entries(state.pages)) {
      const pageIndex = Number(pageKey)
      const seen = new Set<string>()
      const unique: PdfAnnotationObject[] = []
      for (const uid of uids) {
        if (seen.has(uid)) continue
        seen.add(uid)
        const tracked = state.byUid[uid]
        if (tracked) unique.push(tracked.object)
      }
      annotations[pageIndex] = unique
    }

    registry
      ?.getStore()
      .dispatchToPlugin(
        'annotation',
        {
          type: 'ANNOTATION/SET_ANNOTATIONS',
          payload: { documentId, annotations },
        },
        true,
      )
  }, [state, registry, documentId])

  return null
}
