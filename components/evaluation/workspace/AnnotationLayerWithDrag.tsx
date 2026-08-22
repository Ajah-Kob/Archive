'use client'

import { useCallback, useRef } from 'react'
import {
  AnnotationLayer,
  useAnnotationPlugin,
} from '@embedpdf/plugin-annotation/react'
import type { CustomAnnotationRendererProps } from '@embedpdf/plugin-annotation/react'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { PdfAnnotationObject } from '@embedpdf/models'

interface AnnotationLayerWithDragProps {
  /** Active document id — its annotations are rendered. */
  documentId: string
  /** Page index rendered by this layer. */
  pageIndex: number
}

/**
 * Annotation types that get the drag-on-hover surface. The plugin's own drag
 * surface only activates once an annotation is SELECTED (its controller starts
 * idle on the same gesture), so unselected annotations could never be dragged
 * in one motion. The extra surface below makes press-and-drag move the
 * annotation immediately, without a prior click-to-select gesture.
 */
const DRAGGABLE_TYPES = new Set<PdfAnnotationSubtype>([
  PdfAnnotationSubtype.HIGHLIGHT,
  PdfAnnotationSubtype.STRIKEOUT,
  PdfAnnotationSubtype.FREETEXT,
])

/**
 * AnnotationLayer with the workspace's interaction rules applied:
 *
 * 1. The annotation's visual (highlight/strikeout/freeText) ALWAYS renders —
 *    it is independent of the selection state. Only the comment focus
 *    (Comments panel card highlight) is tied to selection, and that lives in
 *    DocumentWorkspace, not here.
 * 2. Highlight/strikeout/freeText get a transparent drag surface that is
 *    active while the annotation is unselected: pointerdown selects the
 *    annotation (via the layer's own select handler — clears any text
 *    selection, so dragging never duplicates text) and starts a plugin drag
 *    session; pointermove feeds the delta; pointerup commits. The surface
 *    stays mounted after selection (pointer capture keeps the gesture alive)
 *    and turns `pointer-events: none` so the plugin's own drag surface takes
 *    over for subsequent gestures.
 *
 * Renders the AnnotationLayer with the custom renderer — must live inside the
 * EmbedPDF tree (uses plugin hooks).
 */
export function AnnotationLayerWithDrag({
  documentId,
  pageIndex,
}: AnnotationLayerWithDragProps) {
  const { plugin } = useAnnotationPlugin()
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  const customAnnotationRenderer = useCallback(
    ({
      annotation,
      children,
      isSelected,
      scale,
      pageWidth,
      pageHeight,
      onSelect,
    }: CustomAnnotationRendererProps<PdfAnnotationObject>) => {
      const type = annotation.type
      const draggable = DRAGGABLE_TYPES.has(type)

      const dragSurface = draggable ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: isSelected ? 'none' : 'auto',
            cursor: isSelected ? 'default' : 'move',
            zIndex: 1,
          }}
          onPointerDown={(e) => {
            // Select (or toggle with ctrl/meta) + stop propagation so the
            // selection plugin never starts a text selection over the
            // annotation — dragging an existing annotation moves it instead of
            // duplicating its text.
            onSelect?.(e)
            if (!plugin) return
            dragStartRef.current = { x: e.clientX, y: e.clientY }
            plugin.startDrag(documentId, {
              annotationIds: [annotation.id],
              pageSize: { width: pageWidth, height: pageHeight },
            })
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const start = dragStartRef.current
            if (!start || !plugin) return
            // Screen delta → page delta (the plugin's drag API works in page
            // coordinates; page rotation is 0 in this workspace).
            plugin.updateDrag(documentId, {
              x: (e.clientX - start.x) / scale,
              y: (e.clientY - start.y) / scale,
            })
          }}
          onPointerUp={(e) => {
            if (!dragStartRef.current || !plugin) return
            dragStartRef.current = null
            plugin.commitDrag(documentId)
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId)
            }
          }}
          onPointerCancel={(e) => {
            if (!dragStartRef.current || !plugin) return
            dragStartRef.current = null
            plugin.cancelDrag(documentId)
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId)
            }
          }}
        />
      ) : null

      return (
        <>
          {children}
          {dragSurface}
        </>
      )
    },
    [documentId, plugin],
  )

  return (
    <AnnotationLayer
      documentId={documentId}
      pageIndex={pageIndex}
      selectionOutline={{
        color: '#707dff',
        style: 'solid',
        width: 1.5,
        offset: 2,
      }}
      customAnnotationRenderer={customAnnotationRenderer}
    />
  )
}