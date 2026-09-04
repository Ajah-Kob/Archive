'use client'

import { useCallback, useRef } from 'react'
import {
  AnnotationLayer,
  useAnnotationPlugin,
} from '@embedpdf/plugin-annotation/react'
import type { CustomAnnotationRendererProps } from '@embedpdf/plugin-annotation/react'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { PdfAnnotationObject } from '@embedpdf/models'
import { getAnnotationSegments } from '@/components/defense/workspace/review-annotations'

interface AnnotationLayerWithDragProps {
  /** Active document id — its annotations are rendered. */
  documentId: string
  /** Page index rendered by this layer. */
  pageIndex: number
  /**
   * Read-only mode (student workspace): annotations render and stay
   * selectable, but the press-and-drag move surface is never mounted —
   * annotations cannot be moved.
   */
  readOnly?: boolean
}

/**
 * Annotation types that get the drag-on-hover surface. The plugin's own drag
 * surface only activates once an annotation is SELECTED (its controller starts
 * idle on the same gesture), so unselected annotations could never be dragged
 * in one motion. The extra surface below makes press-and-drag move the
 * annotation immediately, without a prior click-to-select gesture.
 *
 * Ink and sticky-note (TEXT) annotations are single-rect — their
 * getAnnotationSegments() is exactly their bounds, so the surface covers only
 * the annotation itself.
 */
const DRAGGABLE_TYPES = new Set<PdfAnnotationSubtype>([
  PdfAnnotationSubtype.HIGHLIGHT,
  PdfAnnotationSubtype.STRIKEOUT,
  PdfAnnotationSubtype.FREETEXT,
  PdfAnnotationSubtype.INK,
  PdfAnnotationSubtype.TEXT,
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
 * 3. Selection/hover outlines are NOT rendered here at all — AnnotationHover's
 *    viewer-space overlay draws them (tight per-fragment boxes for text
 *    markup) so hovering and selecting share one geometry pipeline.
 *
 * Renders the AnnotationLayer with the custom renderer — must live inside the
 * EmbedPDF tree (uses plugin hooks).
 */
export function AnnotationLayerWithDrag({
  documentId,
  pageIndex,
  readOnly = false,
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
      const draggable = !readOnly && DRAGGABLE_TYPES.has(type)

      // One drag surface PER annotated fragment (getAnnotationSegments):
      // text markup only captures the pointer over its actual quads, so
      // unannotated text between/after fragments keeps normal hover + text
      // selection for creating new annotations. FreeText (single segment =
      // full rect) behaves exactly like the old full-box surface.
      const dragSurfaces = draggable ? (
        getAnnotationSegments(annotation).map((seg, i) => (
          <div
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: (seg.origin.x - annotation.rect.origin.x) * scale,
              top: (seg.origin.y - annotation.rect.origin.y) * scale,
              width: seg.size.width * scale,
              height: seg.size.height * scale,
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
        ))
      ) : null

      return (
        <>
          {children}
          {dragSurfaces}
        </>
      )
    },
    [documentId, plugin, readOnly],
  )

  return (
    <AnnotationLayer
      documentId={documentId}
      pageIndex={pageIndex}
      // The built-in outline hugs the union bounding /Rect, which for text
      // markup includes unannotated text. Selection + hover outlines are drawn
      // exclusively by AnnotationHover's viewer-space overlay (one geometry
      // pipeline for both states), so the built-in border is made invisible.
      // Its div stays mounted with the drag/double-click handlers attached.
      selectionOutline={{
        color: 'transparent',
        style: 'solid',
        width: 0,
        offset: 2,
      }}
      customAnnotationRenderer={customAnnotationRenderer}
    />
  )
}
