'use client'

import { useEffect, useRef } from 'react'
import { useRegistry, useStoreState } from '@embedpdf/core/react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import { PdfAnnotationSubtype } from '@embedpdf/models'

type ToolId = 'highlight' | 'freeText' | 'ink' | 'strikeout'

interface ToolSettingsPanelProps {
  /** Active document id — reads the tool defaults from its annotation state. */
  documentId: string
  /** Currently active tool (null = cursor — no settings shown). */
  activeTool: ToolId | null
}

/** Main highlighter colors — inline tools (highlight/strikeout) only. */
const INLINE_COLORS = [
  '#FFEB3B', // yellow
  '#4CAF50', // green
  '#2196F3', // blue
  '#FF4081', // pink
  '#FF9800', // orange
]

/** Main pen/text colors — ink and free text (dark, ink-like). */
const PEN_TEXT_COLORS = [
  '#1A1A1A', // black
  '#E44234', // red
  '#2563EB', // blue
  '#16A34A', // green
  '#F59E0B', // orange
]

/** Size options per tool: ink = stroke width, freeText = font size. */
const SIZE_OPTIONS: Partial<Record<ToolId, number[]>> = {
  ink: [2, 4, 6, 8, 10],
  freeText: [10, 12, 14, 16, 18, 20],
}

/** Which default field holds the color for each tool. */
const COLOR_FIELD: Partial<Record<ToolId, string>> = {
  highlight: 'color',
  strikeout: 'color',
  ink: 'strokeColor',
  freeText: 'fontColor',
}

/** Which default field holds the size for each tool. */
const SIZE_FIELD: Partial<Record<ToolId, string>> = {
  ink: 'strokeWidth',
  freeText: 'fontSize',
}

/** The annotation subtype each tool creates — used to match a selected annotation. */
const TOOL_SUBTYPE: Partial<Record<ToolId, PdfAnnotationSubtype>> = {
  highlight: PdfAnnotationSubtype.HIGHLIGHT,
  strikeout: PdfAnnotationSubtype.STRIKEOUT,
  ink: PdfAnnotationSubtype.INK,
  freeText: PdfAnnotationSubtype.FREETEXT,
}

const DEFAULT_COLOR: Partial<Record<ToolId, string>> = {
  highlight: INLINE_COLORS[0],
  strikeout: '#E44234',
  ink: '#E44234',
  freeText: '#E44234',
}

const DEFAULT_SIZE: Partial<Record<ToolId, number>> = {
  ink: 6,
  freeText: 14,
}

/**
 * Per-tool settings strip shown below the header while an annotation tool is
 * active. Lets the adviser change the tool's color (and size for pen/text)
 * before drawing. Updates the annotation plugin's tool defaults via the
 * `SET_TOOL_DEFAULTS` action, so every annotation created with that tool uses
 * the chosen color/size.
 */
export function ToolSettingsPanel({
  documentId,
  activeTool,
}: ToolSettingsPanelProps) {
  const { registry } = useRegistry()
  const storeState = useStoreState()
  const { state, provides } = useAnnotation(documentId)

  // Set the highlight tool's default color to the first inline color once, so
  // a fresh highlight uses the first swatch.
  const highlightDefaultedRef = useRef(false)
  useEffect(() => {
    if (highlightDefaultedRef.current) return
    highlightDefaultedRef.current = true
    registry
      ?.getStore()
      .dispatchToPlugin(
        'annotation',
        {
          type: 'ANNOTATION/SET_TOOL_DEFAULTS',
          payload: {
            toolId: 'highlight',
            patch: { color: INLINE_COLORS[0], strokeColor: INLINE_COLORS[0] },
          },
        },
        true,
      )
  }, [registry])

  if (!activeTool) return null

  // Tools live on the annotation plugin's GLOBAL state (not per-document).
  const tools = (storeState?.plugins?.['annotation']?.tools ?? []) as Array<{
    id: string
    defaults?: Record<string, unknown>
  }>
  const tool = tools.find((t) => t.id === activeTool)
  const defaults = tool?.defaults ?? {}

  const colorField = COLOR_FIELD[activeTool]
  const sizeField = SIZE_FIELD[activeTool]
  const sizeOptions = SIZE_OPTIONS[activeTool]

  // Inline highlight gets the 5 highlighter colors; strikeout, pen and free
  // text get the 5 main ink-like colors.
  const palette =
    activeTool === 'highlight' ? INLINE_COLORS : PEN_TEXT_COLORS

  // If an annotation matching the active tool is selected, the controls edit
  // THAT annotation (its own color/font) instead of the tool defaults.
  const selectedUid = state.selectedUid
  const selectedObject = selectedUid ? state.byUid[selectedUid]?.object : null
  const selectedMatchesTool =
    selectedObject != null && selectedObject.type === TOOL_SUBTYPE[activeTool]

  const currentColor = selectedMatchesTool
    ? (selectedObject[colorField] as string | undefined) ??
      DEFAULT_COLOR[activeTool] ??
      '#FFCD45'
    : (defaults[colorField] as string | undefined) ??
      DEFAULT_COLOR[activeTool] ??
      '#FFCD45'

  const currentSize = selectedMatchesTool
    ? (selectedObject[sizeField] as number | undefined) ??
      DEFAULT_SIZE[activeTool]
    : (defaults[sizeField] as number | undefined) ?? DEFAULT_SIZE[activeTool]

  function updateDefaults(patch: Record<string, unknown>) {
    registry
      ?.getStore()
      .dispatchToPlugin(
        'annotation',
        {
          type: 'ANNOTATION/SET_TOOL_DEFAULTS',
          payload: { toolId: activeTool, patch },
        },
        true,
      )
  }

  function applyColor(color: string) {
    // Inline tools (highlight/strikeout) render from `strokeColor` — set both
    // fields so the drawn markup actually changes color.
    const patch =
      activeTool === 'highlight' || activeTool === 'strikeout'
        ? { color, strokeColor: color }
        : { [colorField]: color }

    if (selectedMatchesTool && selectedObject) {
      provides?.updateAnnotation(
        selectedObject.pageIndex,
        selectedObject.id,
        patch,
      )
    } else {
      updateDefaults(patch)
    }
  }

  function applySize(size: number) {
    if (selectedMatchesTool && selectedObject) {
      provides?.updateAnnotation(
        selectedObject.pageIndex,
        selectedObject.id,
        { [sizeField]: size },
      )
    } else {
      updateDefaults({ [sizeField]: size })
    }
  }

  return (
    // `data-preserve-editor` — pointerdowns here never cancel a pending
    // annotation's comment editor (color/size changes are not abandonment).
    <div
      data-preserve-editor
      className="flex items-center justify-center gap-[14px] px-6 h-[48px] bg-white border-b border-[#eceef8] shrink-0"
    >
      <span className="font-sans font-extrabold text-[9px] leading-[13px] tracking-[0.8px] uppercase text-[#bbc0d8]">
        Color
      </span>
      <div className="flex items-center gap-[6px]">
        {palette.map((color) => {
          const isActive = currentColor.toLowerCase() === color.toLowerCase()
          return (
            <button
              key={color}
              type="button"
              onClick={() => applyColor(color)}
              aria-label={`Set color ${color}`}
              title={color}
              className={`size-[20px] rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none ${
                isActive
                  ? 'ring-2 ring-[#707dff] ring-offset-1 scale-110'
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
            />
          )
        })}
      </div>

      {sizeOptions && sizeField && (
        <>
          <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />
          <span className="font-sans font-extrabold text-[9px] leading-[13px] tracking-[0.8px] uppercase text-[#bbc0d8]">
            Size
          </span>
          {activeTool === 'ink' ? (
            <div className="flex items-center gap-[8px]">
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={currentSize ?? 6}
                onChange={(e) => applySize(Number(e.target.value))}
                aria-label="Pen size"
                className="w-[120px] h-[4px] accent-[#707dff] cursor-pointer"
              />
              <span className="w-[18px] text-center font-sans font-bold text-[11px] leading-[16px] text-[#3d4566]">
                {currentSize ?? 6}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-[6px]">
              {sizeOptions.map((size) => {
                const isActive = currentSize === size
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => applySize(size)}
                    aria-label={`Set size ${size}`}
                    title={`${size}`}
                    className={`min-w-[26px] h-[26px] px-[6px] rounded-[7px] font-sans font-bold text-[11px] leading-[16px] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none ${
                      isActive
                        ? 'bg-[#f4f6ff] border border-[#e5e8ff] text-[#707dff]'
                        : 'text-[#8a93b4] hover:bg-gray-50 hover:text-[#3d4566]'
                    }`}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
