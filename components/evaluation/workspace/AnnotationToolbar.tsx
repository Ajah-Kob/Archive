'use client'

import { useEffect } from 'react'
import {
  Highlighter,
  MousePointer2,
  Pen,
  Strikethrough,
  Trash2,
  Type,
} from 'lucide-react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'

export type ToolId = 'highlight' | 'freeText' | 'ink' | 'strikeout'

interface AnnotationToolbarProps {
  /** Active document id from the EmbedPDF document-manager plugin. */
  documentId: string
  /** Currently active tool (controlled by the workspace). */
  activeTool: ToolId | null
  /** Called when the active tool changes (user click or plugin reset). */
  onActiveToolChange: (tool: ToolId | null) => void
}

interface ToolDef {
  id: ToolId
  label: string
  icon: typeof Highlighter
}

/** Tools grouped by PDF annotation category (rendered as one flat row). */
const TOOL_GROUPS: ReadonlyArray<{
  tools: ReadonlyArray<ToolDef>
}> = [
  {
    tools: [
      { id: 'highlight', label: 'Highlight', icon: Highlighter },
      { id: 'strikeout', label: 'Strikeout', icon: Strikethrough },
    ],
  },
  {
    tools: [{ id: 'ink', label: 'Ink pen', icon: Pen }],
  },
  {
    tools: [{ id: 'freeText', label: 'Free text', icon: Type }],
  },
]

const BASE_BUTTON =
  'relative flex items-center justify-center size-[30px] rounded-[7px] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none'
const ACTIVE_BUTTON = 'bg-[#f4f6ff] border border-[#e5e8ff] text-[#707dff]'
const IDLE_BUTTON = 'text-[#8a93b4] hover:bg-gray-50 hover:text-[#3d4566]'

/** Small dot shown under the currently active tool. */
function ActiveIndicator() {
  return (
    <span
      aria-hidden="true"
      className="absolute bottom-[2.5px] left-1/2 -translate-x-1/2 size-[4px] rounded-full bg-[#707dff]"
    />
  )
}

/**
 * Annotation tool buttons for the adviser review workspace header. The tools
 * are grouped by PDF annotation category (Inline, Drawing, Text) but rendered
 * as one flat row without category labels or separators — plus the selection
 * cursor and a delete button. The active tool is tracked locally and kept in
 * sync with the plugin via `onActiveToolChange` (e.g. the plugin auto-resetting
 * to selection after a commit).
 */
export function AnnotationToolbar({
  documentId,
  activeTool,
  onActiveToolChange,
}: AnnotationToolbarProps) {
  const { provides: api, state } = useAnnotation(documentId)

  // Keep the toolbar highlight in sync when the plugin changes the active
  // tool itself. Match by tool ID (the `name` is a display string like
  // "Highlight" and does NOT equal the id). Guarded defensively — the method
  // may not exist on older plugin builds, and the unsubscribe may not return.
  useEffect(() => {
    if (!api || typeof api.onActiveToolChange !== 'function') return
    const unsubscribe = api.onActiveToolChange((tool) => {
      onActiveToolChange((tool?.id as ToolId | undefined) ?? null)
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [api, onActiveToolChange])

  function selectTool(tool: ToolId | null) {
    // Clicking the already-active tool toggles it off (back to the cursor).
    const next = activeTool === tool && tool !== null ? null : tool
    onActiveToolChange(next)
    api?.setActiveTool(next)
  }

  function deleteSelected() {
    // Delete ALL selected annotations (single or multi-select). The marquee
    // select tool can select several at once — getSelectedAnnotations returns
    // every tracked annotation in selectedUids.
    const selected = api?.getSelectedAnnotations()
    if (!selected || selected.length === 0) return
    api?.deleteAnnotations(
      selected.map((ta) => ({
        pageIndex: ta.object.pageIndex,
        id: ta.object.id,
      })),
    )
  }

  // selectedUid is null when MULTIPLE annotations are selected, so the delete
  // button must key off the selectedUids array length instead.
  const hasSelection = (state.selectedUids?.length ?? 0) > 0

  return (
    <div
      role="toolbar"
      aria-label="Annotation tools"
      className="flex items-center gap-[10px] bg-white border border-[#eceef8] rounded-[9px] p-[4px] shrink-0"
    >
      {TOOL_GROUPS.flatMap((group) => group.tools).map(
        ({ id, label, icon: Icon }) => {
          const isActive = activeTool === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTool(id)}
              aria-label={label}
              title={label}
              aria-pressed={isActive}
              className={`${BASE_BUTTON} ${
                isActive ? ACTIVE_BUTTON : IDLE_BUTTON
              }`}
            >
              <Icon className="size-[15px]" strokeWidth={1.75} />
              {isActive && <ActiveIndicator />}
            </button>
          )
        },
      )}

      <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />

      <button
        type="button"
        onClick={() => selectTool(null)}
        aria-label="Select (cursor)"
        title="Select"
        aria-pressed={activeTool === null}
        className={`${BASE_BUTTON} ${
          activeTool === null ? ACTIVE_BUTTON : IDLE_BUTTON
        }`}
      >
        <MousePointer2 className="size-[15px]" strokeWidth={1.75} />
        {activeTool === null && <ActiveIndicator />}
      </button>

      <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />

      <button
        type="button"
        onClick={deleteSelected}
        disabled={!hasSelection}
        aria-label="Delete selected annotation"
        title="Delete annotation"
        className={`${BASE_BUTTON} text-[#8a93b4] hover:bg-gray-50 hover:text-[#e11d48] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#8a93b4]`}
      >
        <Trash2 className="size-[15px]" strokeWidth={1.75} />
      </button>
    </div>
  )
}
