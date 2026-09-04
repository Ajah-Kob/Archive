'use client'

import { useEffect } from 'react'
import { useSelectionCapability } from '@embedpdf/plugin-selection/react'

interface DisableTextSelectionProps {
  /** Active document id — its cursor text selection is disabled. */
  documentId: string
}

/**
 * Disables text selection/copying for the default cursor (pointer mode), so
 * dragging with the cursor no longer selects or copies document text.
 *
 * Highlight/strikeout tools are unaffected — the annotation plugin enables
 * text selection for their own modes, which is required for those tools to
 * work.
 *
 * NOTE: `enableForMode` REPLACES the whole pointer-mode config, so the marquee
 * box-selection flags must be re-declared here. Without them, the select tool
 * (pointer mode) loses its drag-to-select box — `enableMarquee`/`showMarqueeRects`
 * would be dropped and the marquee handler would never activate.
 *
 * Renders nothing — a behavior-only component living inside the EmbedPDF tree.
 */
export function DisableTextSelection({ documentId }: DisableTextSelectionProps) {
  const { provides } = useSelectionCapability()

  useEffect(() => {
    if (!provides) return
    provides.enableForMode(
      'pointerMode',
      {
        enableSelection: false,
        showSelectionRects: false,
        // Preserve marquee box selection for the select tool (see note above).
        enableMarquee: true,
        showMarqueeRects: true,
      },
      documentId,
    )
  }, [provides, documentId])

  return null
}
