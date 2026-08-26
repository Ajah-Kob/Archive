'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import { useStoreState } from '@embedpdf/core/react'
import type { PdfAnnotationObject } from '@embedpdf/models'
import {
  isReviewAnnotation,
  getAnnotationSegments,
} from '@/components/evaluation/workspace/review-annotations'

interface AnnotationHoverProps {
  /** Active document id — its annotations are hit-tested. */
  documentId: string
  /** The viewer container (relative) — overlays position against it. */
  viewerRef: React.RefObject<HTMLDivElement | null>
  /**
   * Read-only mode (student workspace): hover border + click-to-select still
   * work, but the delete menu is never rendered.
   */
  readOnly?: boolean
  /** Highlights the clicked annotation's comment in the Comments panel. */
  onSelectAnnotation: (annotationId: string, pageIndex: number) => void
  /** Force-open the delete menu for a specific annotation. */
  initialMenuId?: string | null
  /** Called when clicking outside any annotation to deselect. */
  onDeselectAnnotation: () => void
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

interface AnnotationTarget {
  id: string
  pageIndex: number
  /** Screen-space boxes for EACH annotated fragment — text markup has one
   * quad per fragment/line; other types have exactly one (= their rect). */
  boxes: Box[]
  /** Anchor for the click menu — union of all fragments (screen space). */
  menuBox: Box
}

/**
 * The single geometry pipeline for annotation overlays. Hover AND selected
 * states render through these viewer-space boxes, so both states show the
 * exact same bounds — the annotated fragments only, never the union /Rect,
 * with zero size difference between hovering and clicking.
 */

function pointInBox(e: { clientX: number; clientY: number }, box: Box) {
  return (
    e.clientX >= box.left &&
    e.clientX <= box.left + box.width &&
    e.clientY >= box.top &&
    e.clientY <= box.top + box.height
  )
}

/**
 * Hovering an annotation draws a border around it; clicking an annotation opens
 * a small selection menu below it with a Delete action.
 *
 * CSS `:hover` cannot work here: the annotation's visual layer is
 * `pointer-events: none` and its wrapper is 0×0, so no hover event fires.
 * Instead this component hit-tests the pointer against each annotation's
 * `rect` (converted to screen space via the page wrapper + document scale).
 *
 * The border follows the pointer (hover). The menu is click-based: it opens on
 * click, toggles closed on a second click of the same annotation, and closes
 * when clicking anywhere else or after an action runs.
 *
 * Renders nothing when nothing is hovered and no menu is open.
 */
export function AnnotationHover({
  documentId,
  viewerRef,
  readOnly = false,
  onSelectAnnotation,
  onDeselectAnnotation,
  initialMenuId,
}: AnnotationHoverProps) {
  const { state, provides } = useAnnotation(documentId)
  const storeState = useStoreState()
  const [hovered, setHovered] = useState<AnnotationTarget | null>(null)
  const [menu, setMenu] = useState<AnnotationTarget | null>(null)
  /** Currently SELECTED annotations — rendered with the same tight boxes as
   * hover so clicking never changes the outline's size or position. */
  const [selected, setSelected] = useState<AnnotationTarget[]>([])
  const menuRef = useRef<AnnotationTarget | null>(null)
  menuRef.current = menu
  const onSelectRef = useRef(onSelectAnnotation)
  onSelectRef.current = onSelectAnnotation

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const scale =
      storeState?.core?.documents?.[documentId]?.scale ?? 1

    function buildTarget(
      pageEl: HTMLElement,
      pageIndex: number,
      uid: string,
      obj: PdfAnnotationObject,
    ): AnnotationTarget {
      const pageRect = pageEl.getBoundingClientRect()
      const viewerRect = viewer.getBoundingClientRect()
      const toScreen = (r: typeof obj.rect): Box => ({
        left: pageRect.left - viewerRect.left + r.origin.x * scale,
        top: pageRect.top - viewerRect.top + r.origin.y * scale,
        width: r.size.width * scale,
        height: r.size.height * scale,
      })
      // One box per annotated fragment — text markup hit-tests and draws
      // tightly around its quads, never around the union /Rect.
      const boxes = getAnnotationSegments(obj).map(toScreen)
      const r = obj.rect
      const menuBox = {
        left:
          pageRect.left -
          viewerRect.left +
          (r.origin.x + r.size.width / 2) * scale -
          48,
        top:
          pageRect.top -
          viewerRect.top +
          (r.origin.y + r.size.height) * scale +
          6,
        width: 96,
        height: 32,
      }
      return { id: uid, pageIndex, boxes, menuBox }
    }

    function findAnnotation(e: { clientX: number; clientY: number }): AnnotationTarget | null {
      const pages = viewer.querySelectorAll<HTMLElement>('[data-page-index]')
      for (const pageEl of pages) {
        const pageRect = pageEl.getBoundingClientRect()
        const insidePage =
          e.clientX >= pageRect.left &&
          e.clientX <= pageRect.right &&
          e.clientY >= pageRect.top &&
          e.clientY <= pageRect.bottom
        if (!insidePage) continue

        const pageIndex = Number(pageEl.getAttribute('data-page-index'))

        const uids = state.pages[pageIndex] ?? []
        for (const uid of uids) {
          const obj = state.byUid[uid]?.object
          if (!obj) continue
          // Native document annotations (hyperlinks etc.) are not review
          // targets — no hover border, no delete menu. Links stay clickable.
          if (!isReviewAnnotation(obj)) continue
          // Hit-test the EXACT annotated fragments (per-quad for text markup)
          // — unannotated text inside the union /Rect must not react.
          const pageX = (e.clientX - pageRect.left) / scale
          const pageY = (e.clientY - pageRect.top) / scale
          const inside = getAnnotationSegments(obj).some(
            (seg) =>
              pageX >= seg.origin.x &&
              pageX <= seg.origin.x + seg.size.width &&
              pageY >= seg.origin.y &&
              pageY <= seg.origin.y + seg.size.height,
          )
          if (!inside) continue

          return buildTarget(pageEl, pageIndex, uid, obj)
        }
        return null
      }
      return null
    }

    // Locate a SPECIFIC annotation (by id) in the current layout — used to
    // keep the open menu attached to its annotation across zoom/panel/resize
    // changes and to draw the SELECTED annotation's outline.
    function findAnnotationById(id: string): AnnotationTarget | null {
      const pages = viewer.querySelectorAll<HTMLElement>('[data-page-index]')
      for (const pageEl of pages) {
        const pageIndex = Number(pageEl.getAttribute('data-page-index'))
        const uids = state.pages[pageIndex] ?? []
        if (!uids.includes(id)) continue
        const obj = state.byUid[id]?.object
        if (!obj || !isReviewAnnotation(obj)) continue
        return buildTarget(pageEl, pageIndex, id, obj)
      }
      return null
    }

    // Recompute the open menu's box/menuBox from the CURRENT layout so the
    // delete button follows the annotation immediately.
    function recomputeMenu() {
      const current = menuRef.current
      if (!current) return
      const target = findAnnotationById(current.id)
      if (target) setMenu(target)
    }

    // Rebuild the selected annotations' targets from the CURRENT layout so
    // their outlines track zoom/scroll/panel changes exactly like hover does.
    function recomputeSelected() {
      const ids = state.selectedUids ?? []
      const targets: AnnotationTarget[] = []
      for (const id of ids) {
        const target = findAnnotationById(id)
        if (target) targets.push(target)
      }
      setSelected(targets)
    }

    function handlePointerMove(e: PointerEvent) {
      setHovered(findAnnotation(e))
    }

    function handleClick(e: MouseEvent) {
      // Clicking the menu's own buttons is handled by the buttons themselves.
      // The menuBox is viewer-relative, but clientX/Y are viewport-relative —
      // convert the click into viewer space before the hit test so the menu
      // click early-returns and never interferes with the Delete button.
      const viewerRect = viewer.getBoundingClientRect()
      const clickInViewer = {
        clientX: e.clientX - viewerRect.left,
        clientY: e.clientY - viewerRect.top,
      }
      if (menuRef.current && pointInBox(clickInViewer, menuRef.current.menuBox)) return
      // Hit-test directly (not via hover state) so the menu reliably opens on
      // the clicked annotation.
      const target = findAnnotation(e)
      if (target) {
        // Read-only: selection only — no delete menu.
        if (!readOnly) {
          setMenu((m) => (m && m.id === target.id ? null : target))
        }
        // Highlight the clicked annotation's comment (opens the panel if closed).
        onSelectRef.current(target.id, target.pageIndex)
        return
      }
      // Clicked outside any annotation — close the menu.
      setMenu(null)
      onDeselectAnnotation()
    }

    // The annotation was deleted externally (Comments panel, toolbar, Delete
    // key) — close the menu and clear the hover so no stale UI state lingers.
    const menuId = menuRef.current?.id
    if (menuId && !state.byUid[menuId]) {
      setMenu(null)
      setHovered((h) => (h && h.id === menuId ? null : h))
    }
    // Keep the open menu attached to its annotation across layout changes
    // (zoom via storeState, panel open/close + window resize via observer)
    // and keep the selected outlines aligned with the same layout.
    recomputeMenu()
    recomputeSelected()

    if (initialMenuId) {
      const target = findAnnotationById(initialMenuId)
      if (target) setMenu(target)
    }

    viewer.addEventListener('pointermove', handlePointerMove)
    viewer.addEventListener('click', handleClick)
    const resizeObserver = new ResizeObserver(() => {
      recomputeMenu()
      recomputeSelected()
    })
    resizeObserver.observe(viewer)
    return () => {
      viewer.removeEventListener('pointermove', handlePointerMove)
      viewer.removeEventListener('click', handleClick)
      resizeObserver.disconnect()
    }
  }, [viewerRef, state, storeState, documentId, readOnly, initialMenuId])

  // Hovering an already-selected annotation must not double-draw its outline.
  const hoveredVisible =
    hovered !== null && !state.selectedUids.includes(hovered.id)

  return (
    <>
      {/* Selected outlines — SAME viewer-space fragment boxes as hover, so
          clicking changes only the state, never the geometry. */}
      {selected.map((target) =>
        target.boxes.map((box, i) => (
          <div
            key={`sel-${target.id}-${i}`}
            aria-hidden="true"
            className="pointer-events-none absolute z-10 border-[1.5px] border-[#707dff] rounded-[2px]"
            style={{
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
            }}
          />
        )),
      )}
      {hoveredVisible &&
        hovered.boxes.map((box, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute z-10 border-[1.5px] border-[#707dff] rounded-[2px]"
            style={{
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
            }}
          />
        ))}
      {menu && (
        <div
          className="absolute z-20 flex items-center gap-[4px] h-[32px] px-[6px] rounded-[8px] bg-white border border-[#eceef8] shadow-[0_2px_10px_rgba(30,33,69,0.15)]"
          style={{ left: menu.menuBox.left, top: menu.menuBox.top }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              provides?.deleteAnnotation(menu.pageIndex, menu.id)
              setMenu(null)
            }}
            title="Delete annotation"
            className="flex items-center gap-[6px] h-[26px] px-[8px] rounded-[6px] font-sans font-semibold text-[11.5px] leading-[17px] text-[#e11d48] hover:bg-[rgba(225,29,72,0.08)] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none"
          >
            <Trash2 className="size-[13px]" strokeWidth={2} />
            Delete
          </button>
        </div>
      )}
    </>
  )
}
