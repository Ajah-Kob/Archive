'use client'

import { useEffect, useRef } from 'react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import { PdfAnnotationSubtype } from '@embedpdf/models'

interface AnnotationEmptyGuardProps {
  /** Active document id — its freeText annotations are guarded. */
  documentId: string
}

/**
 * Deletes freeText annotations whose contents are empty or whitespace-only.
 *
 * The freeText editor commits its contents on blur — if the user clears the
 * text and clicks away, the annotation is left with empty `contents` and would
 * otherwise be auto-saved as an empty annotation. This guard watches the
 * annotation state and removes such annotations immediately (before the
 * debounced auto-save can persist them).
 *
 * It is safe while editing: the store only ever sees empty contents AFTER the
 * editor blurs (the contentEditable is local until then), and the default
 * "Insert text" placeholder is never empty, so a freshly created box is never
 * deleted out from under the user.
 *
 * Renders nothing — a behavior-only component living inside the EmbedPDF tree.
 */
export function AnnotationEmptyGuard({ documentId }: AnnotationEmptyGuardProps) {
  const { state, provides } = useAnnotation(documentId)
  const providesRef = useRef(provides)
  providesRef.current = provides

  useEffect(() => {
    const scope = providesRef.current
    if (!scope) return
    for (const [pageKey, uids] of Object.entries(state.pages)) {
      const pageIndex = Number(pageKey)
      for (const uid of uids) {
        const tracked = state.byUid[uid]
        if (!tracked) continue
        const obj = tracked.object
        if (obj.type !== PdfAnnotationSubtype.FREETEXT) continue
        if ((obj.contents ?? '').trim() === '') {
          scope.deleteAnnotation(pageIndex, obj.id)
        }
      }
    }
  }, [state])

  return null
}