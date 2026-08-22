'use client'

import { useEffect, useState } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import { useHistoryCapability } from '@embedpdf/plugin-history/react'

/**
 * Undo/Redo controls for the adviser document workspace.
 *
 * Renders Undo/Redo buttons and listens for Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z)
 * to undo/redo annotation changes via the history plugin. Ignores the keys
 * when focus is in an input/textarea (e.g. the comment editor).
 */
export function UndoRedo() {
  const { provides } = useHistoryCapability()
  const [, setTick] = useState(0)

  // Re-render when undo/redo availability changes (history state updates).
  useEffect(() => {
    if (!provides) return
    const unsub = provides.onHistoryChange?.(() => setTick((t) => t + 1))
    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [provides])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        provides?.undo()
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        provides?.redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [provides])

  const canUndo = provides?.canUndo() ?? false
  const canRedo = provides?.canRedo() ?? false

  const BUTTON =
    'flex items-center justify-center size-[30px] rounded-[7px] text-[#8a93b4] hover:bg-gray-50 hover:text-[#3d4566] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'

  return (
    <div className="flex items-center gap-[2px] bg-white border border-[#eceef8] rounded-[9px] p-[4px] shrink-0">
      <button
        type="button"
        onClick={() => provides?.undo()}
        disabled={!canUndo}
        aria-label="Undo (Ctrl+Z)"
        title="Undo (Ctrl+Z)"
        className={BUTTON}
      >
        <Undo2 className="size-[15px]" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => provides?.redo()}
        disabled={!canRedo}
        aria-label="Redo (Ctrl+Y)"
        title="Redo (Ctrl+Y)"
        className={BUTTON}
      >
        <Redo2 className="size-[15px]" strokeWidth={1.75} />
      </button>
    </div>
  )
}
