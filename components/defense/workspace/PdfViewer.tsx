'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { createPluginRegistration } from '@embedpdf/core'
import { EmbedPDF } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import {
  DocumentContent,
  DocumentManagerPluginPackage,
} from '@embedpdf/plugin-document-manager/react'
import { Viewport, ViewportPluginPackage } from '@embedpdf/plugin-viewport/react'
import { Scroller, ScrollPluginPackage } from '@embedpdf/plugin-scroll/react'
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react'
import {
  PagePointerProvider,
  InteractionManagerPluginPackage,
} from '@embedpdf/plugin-interaction-manager/react'
import { SelectionLayer, SelectionPluginPackage } from '@embedpdf/plugin-selection/react'
import { HistoryPluginPackage } from '@embedpdf/plugin-history/react'
import {
  AnnotationLayer,
  AnnotationPluginPackage,
  useAnnotation,
} from '@embedpdf/plugin-annotation/react'
import type { AnnotationTransferItem } from '@embedpdf/plugin-annotation'

export interface PdfViewerProps {
  /** Public Vercel Blob URL of the submitted document. */
  src: string
  /** Adviser's display name — stamped on every annotation created in this viewer. */
  annotationAuthor: string
  /** Saved annotations to hydrate on load (serialized AnnotationTransferItem[]). */
  initialAnnotations?: AnnotationTransferItem[]
}

/**
 * Headless EmbedPDF viewer for the adviser review workspace.
 *
 * Plugin registration order matters — each plugin's dependencies must be
 * registered before it: document-manager → viewport → scroll → render →
 * interaction-manager → selection → history → annotation.
 *
 * Each rendered page is wrapped in `PagePointerProvider` with the layer stack
 * `RenderLayer` → `SelectionLayer` → `AnnotationLayer` on top.
 */
export function PdfViewer({ src, annotationAuthor, initialAnnotations }: PdfViewerProps) {
  const { engine, isLoading, error } = usePdfiumEngine()

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: src }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(InteractionManagerPluginPackage),
      // toleranceFactor: 0 requires exact glyph hits — dragging past the end of
      // a line no longer snaps to the last glyph, so highlight/strikeout boxes
      // only cover the text actually selected (not the whole line).
      createPluginRegistration(SelectionPluginPackage, { toleranceFactor: 0 }),
      createPluginRegistration(HistoryPluginPackage),
      createPluginRegistration(AnnotationPluginPackage, {
        annotationAuthor,
      }),
    ],
    [src, annotationAuthor],
  )

  if (error) {
    return (
      <div className="flex h-full w-full min-h-[480px] flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <TriangleAlert className="size-6 text-[#d97706]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          Failed to load the PDF engine.
        </p>
      </div>
    )
  }

  if (isLoading || !engine) {
    return (
      <div className="flex h-full w-full min-h-[480px] flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <Loader2 className="size-6 animate-spin text-[#707dff]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          Loading PDF engine…
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full min-h-[480px] overflow-hidden bg-[#e8eaf4] relative">
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) =>
          activeDocumentId && (
            <DocumentContent documentId={activeDocumentId}>
              {({ isLoaded }) =>
                isLoaded && (
                  <>
                    <AnnotationHydrator
                      documentId={activeDocumentId}
                      initialAnnotations={initialAnnotations}
                    />
                    <Viewport documentId={activeDocumentId}>
                      <Scroller
                        documentId={activeDocumentId}
                        renderPage={({ width, height, pageIndex }) => (
                          <div style={{ width, height }}>
                            <PagePointerProvider
                              documentId={activeDocumentId}
                              pageIndex={pageIndex}
                            >
                              <RenderLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                              <SelectionLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                              <AnnotationLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                            </PagePointerProvider>
                          </div>
                        )}
                      />
                    </Viewport>
                  </>
                )
              }
            </DocumentContent>
          )
        }
      </EmbedPDF>
    </div>
  )
}

/**
 * Hydrates saved annotations into the annotation plugin once the document's
 * annotation scope is ready. Imports exactly once per document — the ref is
 * reset when the active document changes so each document hydrates its own set.
 */
function AnnotationHydrator({
  documentId,
  initialAnnotations,
}: {
  documentId: string
  initialAnnotations?: AnnotationTransferItem[]
}) {
  const { provides } = useAnnotation(documentId)
  const importedRef = useRef(false)

  // Reset when the active document changes so each document hydrates once.
  useEffect(() => {
    importedRef.current = false
  }, [documentId])

  useEffect(() => {
    if (!provides || importedRef.current) return
    importedRef.current = true
    if (initialAnnotations && initialAnnotations.length > 0) {
      provides.importAnnotations(initialAnnotations)
    }
  }, [provides, initialAnnotations, documentId])

  return null
}
