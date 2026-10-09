'use client'

import { useEffect } from 'react'
import { useSelectionCapability } from '@embedpdf/plugin-selection/react'

/**
 * Reader-only clipboard bridge for /repository/[id]. Mounted inside the
 * EmbedPDF tree (via the viewer toolbar slot), renders nothing.
 *
 * The selection plugin only emits the text (onCopyToClipboard) — it never
 * calls navigator.clipboard itself, and nothing in the app subscribes.
 * Without this, dragging paints selection rects but Ctrl+C copies nothing.
 *
 * NOTE: pan owns the default tool here (PanPluginPackage with defaultMode
 * 'always' in the viewer), so drag-to-select does not engage while pan is
 * active. The bridge stays for whatever selection can still be made.
 *
 * Copy is taken over only while a plugin selection is live (checked via
 * getState), so copying header/title text still works natively. Files
 * carrying the PDF no-copy permission flag still refuse — that is the
 * file's own bit, and the plugin logs it to devtools.
 */
export function RepositoryReaderBehaviors({
  documentId,
}: {
  documentId: string | null
}) {
  const { provides: selection } = useSelectionCapability()

  useEffect(() => {
    if (!selection || !documentId) return
    const unsubscribe = selection.onCopyToClipboard((event) => {
      if (event.documentId !== documentId) return
      void navigator.clipboard?.writeText(event.text).catch(() => {})
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [selection, documentId])

  useEffect(() => {
    if (!selection || !documentId) return

    function hasLiveSelection(): boolean {
      try {
        return selection?.getState(documentId as string)?.selection != null
      } catch {
        return false
      }
    }

    function takeOverCopy(e: KeyboardEvent | ClipboardEvent) {
      if (!hasLiveSelection()) return
      e.preventDefault()
      selection?.copyToClipboard(documentId as string)
    }

    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        takeOverCopy(e)
      }
    }

    function onCopy(e: ClipboardEvent) {
      takeOverCopy(e)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('copy', onCopy)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('copy', onCopy)
    }
  }, [selection, documentId])

  return null
}
