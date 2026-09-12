'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X, ZoomIn } from 'lucide-react'

// Crop workspace geometry (display px).
const AREA = 320
const CIRCLE = 200
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const OUTPUT_SIZE = 512

interface LoadedImage {
  source: ImageBitmap | HTMLImageElement
  width: number
  height: number
}

interface ProfileCropModalProps {
  imageUrl: string
  fileName: string
  onSave: (cropped: File) => void
  onClose: () => void
}

async function loadImage(imageUrl: string): Promise<LoadedImage> {
  // Prefer createImageBitmap so phone photos respect EXIF orientation.
  try {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(blob, {
        imageOrientation: 'fromImage',
      } as unknown as ImageBitmapOptions)
      return { source: bmp, width: bmp.width, height: bmp.height }
    }
  } catch {
    // Fall through to the <img> path below.
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Could not load image.'))
    el.src = imageUrl
  })
  return {
    source: img,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  }
}

export function ProfileCropModal({
  imageUrl,
  fileName,
  onSave,
  onClose,
}: ProfileCropModalProps) {
  const [image, setImage] = useState<LoadedImage | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    setImage(null)
    setLoadError(false)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    loadImage(imageUrl).then(
      (loaded) => {
        if (!cancelled) setImage(loaded)
      },
      () => {
        if (!cancelled) setLoadError(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  // Cover scale so the image always fills the crop area at zoom 1.
  const baseScale = image
    ? Math.max(AREA / image.width, AREA / image.height)
    : 1
  const scale = baseScale * zoom
  const scaledW = image ? image.width * scale : 0
  const scaledH = image ? image.height * scale : 0

  const clampOffset = useCallback(
    (x: number, y: number) => {
      // Keep the circle from ever exposing empty space.
      const maxX = Math.max(0, (scaledW - CIRCLE) / 2)
      const maxY = Math.max(0, (scaledH - CIRCLE) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      }
    },
    [scaledW, scaledH],
  )

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!image || busy) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y }
    setDragging(true)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    setOffset(
      clampOffset(drag.ox + (e.clientX - drag.startX), drag.oy + (e.clientY - drag.startY)),
    )
  }

  function endDrag() {
    dragRef.current = null
    setDragging(false)
  }

  function handleZoomChange(value: number) {
    setZoom(value)
    // Re-clamp so the crop stays centered on position when possible.
    setOffset((prev) => clampOffset(prev.x, prev.y))
  }

  async function handleSave() {
    if (!image || busy) return
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Map the display circle back to source pixels.
      const imgLeft = AREA / 2 - scaledW / 2 + offset.x
      const imgTop = AREA / 2 - scaledH / 2 + offset.y
      const circleLeft = AREA / 2 - CIRCLE / 2
      const circleTop = AREA / 2 - CIRCLE / 2
      const srcSize = CIRCLE / scale
      const sx = Math.min(
        Math.max(0, (circleLeft - imgLeft) / scale),
        Math.max(0, image.width - srcSize),
      )
      const sy = Math.min(
        Math.max(0, (circleTop - imgTop) / scale),
        Math.max(0, image.height - srcSize),
      )

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      ctx.drawImage(image.source, sx, sy, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      )
      if (!blob) return
      const base = fileName.replace(/\.[^.]+$/, '') || 'profile'
      onSave(new File([blob], `${base}-cropped.jpg`, { type: 'image/jpeg' }))
    } finally {
      setBusy(false)
    }
  }

  const imgLeft = AREA / 2 - scaledW / 2 + offset.x
  const imgTop = AREA / 2 - scaledH / 2 + offset.y

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] p-4">
      <div className="w-[400px] max-w-full rounded-[16px] border border-[#eceef8] bg-white p-[24px] shadow-[0_20px_60px_rgba(112,125,255,0.18),0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <span className="font-heading text-[16px] font-bold leading-[24px] text-[#10133a]">
            Edit Profile
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Discard and close"
            className="flex size-7 items-center justify-center rounded-lg bg-violet-50 outline outline-1 outline-offset-[-1px] outline-violet-100 transition-colors hover:bg-violet-100 disabled:opacity-60"
          >
            <X className="size-4 text-slate-400" />
          </button>
        </div>

        <div
          className={`relative mx-auto mt-[16px] size-[320px] max-w-full touch-none overflow-hidden rounded-[12px] bg-[#10133a] ${
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {!image && !loadError && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-white/70" />
            </span>
          )}
          {loadError && (
            <span className="absolute inset-0 flex items-center justify-center px-6 text-center font-sans text-[13px] font-medium text-white/70">
              Could not load this image. Please try another file.
            </span>
          )}
          {image && (
            <img
              src={imageUrl}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ left: imgLeft, top: imgTop, width: scaledW, height: scaledH }}
            />
          )}
          {/* Circular mask: dimmed surround + white ring. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{
              width: CIRCLE,
              height: CIRCLE,
              boxShadow:
                '0 0 0 999px rgba(16,19,58,0.55), 0 0 24px rgba(0,0,0,0.25)',
            }}
          />
        </div>

        <div className="flex items-center gap-[12px] pt-[20px]">
          <span className="flex shrink-0 items-center gap-[6px] font-sans text-[12px] font-semibold text-[#5a6382]">
            <ZoomIn className="size-4 text-[#8a93b4]" />
            Zoom
          </span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!image || busy}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            aria-label="Crop zoom"
            className="min-w-0 flex-1 accent-[#707dff]"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!image || busy}
            className="flex shrink-0 items-center gap-[7px] rounded-[9px] border border-[#707dff] bg-[#707dff] px-[19px] py-[10px] font-sans text-[13px] font-bold leading-[19.5px] text-white shadow-[0_2px_8px_rgba(112,125,255,0.35)] transition-colors hover:bg-[#5a67ff] disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
