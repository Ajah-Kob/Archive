'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  AnnotationLayer,
  useAnnotationPlugin,
} from '@embedpdf/plugin-annotation/react'
import type { CustomAnnotationRendererProps } from '@embedpdf/plugin-annotation/react'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { PdfAnnotationObject } from '@embedpdf/models'
import { getAnnotationSegments } from '@/components/evaluation/workspace/review-annotations'

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
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** True once the hold has elapsed and the annotation is actually picked up. */
  const holdingRef = useRef(false)

  // How long a finger must stay put before a touch drag lifts the annotation.
  // Long enough to read as deliberate, short enough not to feel broken.
  const HOLD_MS = 400

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    holdingRef.current = false
  }, [])

  const beginDrag = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      annotationId: string,
      pageSize: { width: number; height: number },
    ) => {
      if (!plugin) return
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      plugin.startDrag(documentId, {
        annotationIds: [annotationId],
        pageSize,
      })
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [plugin, documentId],
  )

  const startHoldTimer = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      annotationId: string,
      pageSize: { width: number; height: number },
    ) => {
      clearHoldTimer()
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null
        holdingRef.current = true
        beginDrag(e, annotationId, pageSize)
      }, HOLD_MS)
    },
    [beginDrag, clearHoldTimer],
  )

  // A pending hold must not fire after the component goes away, or it would
  // start a drag for an annotation that is no longer mounted.
  useEffect(() => clearHoldTimer, [clearHoldTimer])

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
      // Per-fragment surfaces in BOTH modes. The plugin's own surface hit-tests
      // the union /Rect, which for multi-line text markup swallows every
      // unannotated gap between lines — so clicking blank text beside a
      // highlight would select it. Read-only still needs the tight surface, it
      // just must not drag: it selects on pointerdown and nothing more.
      const usesFragmentSurface = DRAGGABLE_TYPES.has(type)
      const draggable = usesFragmentSurface && !readOnly

      // One surface PER annotated fragment (getAnnotationSegments):
      // text markup only captures the pointer over its actual quads, so
      // unannotated text between/after fragments keeps normal hover + text
      // selection for creating new annotations. FreeText (single segment =
      // full rect) behaves exactly like the old full-box surface.
      const dragSurfaces = usesFragmentSurface ? (
        getAnnotationSegments(annotation).map((seg, i) => (
          <div
            key={i}
            aria-hidden="true"
            // Lets the workspace's page-pan handler tell "pointer landed on an
            // annotation" from "pointer landed on empty page" and only pan in
            // the second case.
            data-annotation-drag=""
            style={{
              position: 'absolute',
              left: (seg.origin.x - annotation.rect.origin.x) * scale,
              top: (seg.origin.y - annotation.rect.origin.y) * scale,
              width: seg.size.width * scale,
              height: seg.size.height * scale,
              pointerEvents: isSelected ? 'none' : 'auto',
              cursor: !draggable || isSelected ? 'default' : 'move',
              // Without this the browser claims the gesture for page scrolling
              // and fires pointercancel, so a drag on a touch screen never
              // completes. The trade is that swiping over an annotation no longer
              // scrolls the page, which is the usual behaviour for draggable
              // items on touch. Read-only surfaces never drag, so they keep the
              // browser's scrolling and only narrow what a click selects.
              touchAction: draggable ? 'none' : 'auto',
              zIndex: 1,
            }}
            onPointerDown={(e) => {
              // Select (or toggle with ctrl/meta) + stop propagation so the
              // selection plugin never starts a text selection over the
              // annotation — dragging an existing annotation moves it instead of
              // duplicating its text.
              onSelect?.(e)
              if (!plugin || readOnly) return
              // On touch, a drag means "move the page", so an annotation only
              // picks up after a deliberate hold. A mouse is already precise, so
              // it keeps moving on press-and-drag.
              if (e.pointerType === 'touch') {
                startHoldTimer(e, annotation.id, {
                  width: pageWidth,
                  height: pageHeight,
                })
                return
              }
              beginDrag(e, annotation.id, {
                width: pageWidth,
                height: pageHeight,
              })
            }}
            onPointerMove={(e) => {
              if (holdTimerRef.current !== null) {
                // Moved before the hold completed — the user meant to scroll.
                clearHoldTimer()
                return
              }
              if (!holdingRef.current) return
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
              clearHoldTimer()
              if (!holdingRef.current) {
                holdingRef.current = false
                return
              }
              if (!dragStartRef.current || !plugin) return
              dragStartRef.current = null
              holdingRef.current = false
              plugin.commitDrag(documentId)
              if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId)
              }
            }}
            onPointerCancel={(e) => {
              clearHoldTimer()
              if (!dragStartRef.current || !plugin) return
              dragStartRef.current = null
              holdingRef.current = false
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
    [documentId, plugin, readOnly, beginDrag, clearHoldTimer, startHoldTimer],
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