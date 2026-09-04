'use client'

import { useEffect } from 'react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'

interface AnnotationDeleteKeyProps {
  /** Active document id — its selected annotation is deleted on Delete/Backspace. */
  documentId: string
}

/**
 * Deletes the selected annotation when the user presses Delete or Backspace.
 *
 * Ignores the key when the focus is inside an input/textarea (e.g. the comment
 * editor) so typing text never deletes the annotation.
 *
 * Renders nothing — a behavior-only component living inside the EmbedPDF tree.
 */
export function AnnotationDeleteKey({ documentId }: AnnotationDeleteKeyProps) {
  const { provides, state } = useAnnotation(documentId)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      // Don't delete while typing in an input/textarea (comment editor).
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      const selected = provides?.getSelectedAnnotation()
      if (!selected) return
      e.preventDefault()
      provides?.deleteAnnotation(selected.object.pageIndex, selected.object.id)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [provides, state])

  return null
}
