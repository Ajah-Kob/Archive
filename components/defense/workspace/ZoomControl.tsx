'use client'

import { ZoomIn, ZoomOut } from 'lucide-react'
import { useZoom } from '@embedpdf/plugin-zoom/react'

/** Minimum zoom — 50%. */
export const MIN_ZOOM = 0.5
/** Maximum zoom — 200%. */
export const MAX_ZOOM = 2

interface ZoomControlProps {
  /** Active document id from the document-manager plugin. */
  documentId: string
}

const BUTTON_CLASS =
  'flex items-center justify-center size-[30px] rounded-[7px] text-[#8a93b4] hover:bg-gray-50 hover:text-[#3d4566] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'

/**
 * Zoom controls for the adviser review workspace header.
 *
 * Reads and writes zoom through EmbedPDF's Zoom plugin, which is also what
 * ZoomGestureWrapper drives for pinch and ctrl+wheel. That is deliberate: this
 * used to hold its own scale and dispatch SET_SCALE directly, so the buttons and
 * the gestures would have been two owners writing the same value -- the same
 * split that left pan impossible to switch off.
 *
 * The 50%-200% clamp lives in the plugin registration (minZoom/maxZoom), not
 * here, so the gestures inherit it too.
 */
export function ZoomControl({ documentId }: ZoomControlProps) {
  const { provides: zoom, state } = useZoom(documentId)
  const scale = state?.currentZoomLevel ?? 1

  const percent = Math.round(scale * 100)
  const atMin = scale <= MIN_ZOOM + 0.001
  const atMax = scale >= MAX_ZOOM - 0.001

  return (
    <div className="flex items-center gap-[2px] bg-white border border-[#eceef8] rounded-[9px] p-[4px] shrink-0">
      <button
        type="button"
        onClick={() => zoom?.zoomOut()}
        disabled={!zoom || atMin}
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
        onClick={() => zoom?.zoomIn()}
        disabled={!zoom || atMax}
        aria-label="Zoom in"
        title="Zoom in (max 200%)"
        className={BUTTON_CLASS}
      >
        <ZoomIn className="size-[15px]" strokeWidth={1.75} />
      </button>
    </div>
  )
}