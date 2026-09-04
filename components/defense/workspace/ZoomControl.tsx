'use client'

import { useEffect, useRef } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { SET_SCALE } from '@embedpdf/core'
import { useRegistry } from '@embedpdf/core/react'

/** Minimum zoom — 50%. */
export const MIN_ZOOM = 0.5
/** Maximum zoom — 200%. */
export const MAX_ZOOM = 2
/** Zoom step per click — 10%. */
const ZOOM_STEP = 0.1

interface ZoomControlProps {
  /** Active document id from the document-manager plugin. */
  documentId: string
}

const BUTTON_CLASS =
  'flex items-center justify-center size-[30px] rounded-[7px] text-[#8a93b4] hover:bg-gray-50 hover:text-[#3d4566] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'

/**
 * Zoom controls for the adviser review workspace header.
 *
 * Dispatches the core `SET_SCALE` action scoped to the active document, which
 * makes the viewport recompute page sizes (RenderLayer/AnnotationLayer read
 * the document scale from the store). Clamped to 20%–200% per the workspace
 * spec. Each tab keeps its own zoom level (scale lives per document).
 *
 * Keyboard/mouse shortcuts (active while the workspace is mounted):
 * - Ctrl + scroll up → zoom in; Ctrl + scroll down → zoom out
 * - Ctrl + `+` / `=` / numpad `+` → zoom in; Ctrl + `-` / `_` / numpad `-` → zoom out
 */
export function ZoomControl({ documentId }: ZoomControlProps) {
  const { registry, documents } = useRegistry()
  const scale = documents[documentId]?.scale ?? 1

  function setScale(next: number) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
    registry?.getStore().dispatchToCore({
      type: SET_SCALE,
      payload: { documentId, scale: clamped },
    })
  }

  // Keep the latest scale/documentId/setScale in refs so the listeners attach
  // once and never go stale (scale changes on every zoom; documentId on tab
  // switch).
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const documentIdRef = useRef(documentId)
  documentIdRef.current = documentId
  const setScaleRef = useRef(setScale)
  setScaleRef.current = setScale

  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return
      // Ctrl+wheel is browser page-zoom by default — take it over for the PDF.
      e.preventDefault()
      const next = scaleRef.current + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
      setScaleRef.current(next)
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey) return
      const isZoomIn =
        e.key === '+' || e.key === '=' || e.code === 'NumpadAdd'
      const isZoomOut =
        e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract'
      if (!isZoomIn && !isZoomOut) return
      e.preventDefault()
      setScaleRef.current(
        scaleRef.current + (isZoomIn ? ZOOM_STEP : -ZOOM_STEP),
      )
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const percent = Math.round(scale * 100)

  return (
    <div className="flex items-center gap-[2px] bg-white border border-[#eceef8] rounded-[9px] p-[4px] shrink-0">
      <button
        type="button"
        onClick={() => setScale(scale - ZOOM_STEP)}
        disabled={scale <= MIN_ZOOM}
        aria-label="Zoom out"
        title="Zoom out (min 50%)"
        className={BUTTON_CLASS}
      >
        <ZoomOut className="size-[15px]" strokeWidth={1.75} />
      </button>
      <span
        className="w-[46px] text-center font-sans font-bold text-[11.5px] leading-[17px] text-[#3d4566] select-none"
        aria-live="polite"
      >
        {percent}%
      </span>
      <button
        type="button"
        onClick={() => setScale(scale + ZOOM_STEP)}
        disabled={scale >= MAX_ZOOM}
        aria-label="Zoom in"
        title="Zoom in (max 200%)"
        className={BUTTON_CLASS}
      >
        <ZoomIn className="size-[15px]" strokeWidth={1.75} />
      </button>
    </div>
  )
}
