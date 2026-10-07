'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { blobUrlToPathname, isPrivateBlobPath, toSignedBlobPath } from '@/lib/blob'
import { createPluginRegistration } from '@embedpdf/core'
import { EmbedPDF } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import {
  DocumentContent,
  DocumentManagerPluginPackage,
} from '@embedpdf/plugin-document-manager/react'
import { Viewport, ViewportPluginPackage } from '@embedpdf/plugin-viewport/react'
import { Scroller, ScrollPluginPackage } from '@embedpdf/plugin-scroll/react'
import { PanPluginPackage } from '@embedpdf/plugin-pan/react'
import { ZoomPluginPackage, ZoomGestureWrapper } from '@embedpdf/plugin-zoom/react'
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react'
import {
  PagePointerProvider,
  InteractionManagerPluginPackage,
  GlobalPointerProvider,
} from '@embedpdf/plugin-interaction-manager/react'
import { SelectionLayer, SelectionPluginPackage } from '@embedpdf/plugin-selection/react'
import { HistoryPluginPackage } from '@embedpdf/plugin-history/react'
import {
  AnnotationLayer,
  AnnotationPluginPackage,
  useAnnotation,
} from '@embedpdf/plugin-annotation/react'
import type {
  AnnotationTransferItem,
  FreeTextClickBehavior,
} from '@embedpdf/plugin-annotation'

export interface PdfViewerProps {
  /**
   * Vercel Blob URL of the submitted document, exactly as stored.
   *
   * Not necessarily public: every content prefix (chapter, defense, archiving,
   * archives, templates) is private, so this is resolved through the signed
   * `/api/blob/...` route below rather than handed to the engine as-is.
   */
  src: string
  /** Adviser's display name — stamped on every annotation created in this viewer. */
  annotationAuthor: string
  /** Saved annotations to hydrate on load (serialized AnnotationTransferItem[]). */
  initialAnnotations?: AnnotationTransferItem[]
  /**
   * Read-only mode (finalized evaluations): every tool is registered with
   * interaction overrides that disable drag/resize/rotate — mirroring student
   * mode in DocumentWorkspace. Without this the plugin's own drag surface
   * lets a selected ink or free-text annotation be moved, which no CSS rule
   * can prevent (canvas-level interaction).
   */
  readOnly?: boolean
  /**
   * Called with the EmbedPDF document id once the document is registered.
   *
   * The id is minted inside this component, so a parent that needs it — the
   * finalized view's comments panel, which selects and scrolls to annotations —
   * has no other way to reach it.
   */
  onActiveDocumentId?: (documentId: string) => void
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
export function PdfViewer({
  src,
  annotationAuthor,
  initialAnnotations,
  readOnly = false,
  onActiveDocumentId,
}: PdfViewerProps) {
  const { engine, isLoading, error } = usePdfiumEngine()

  // Resolve the stored Blob URL into something the engine can actually fetch.
  // The engine fetches `src` itself and sends no credentials, so a private Blob
  // URL comes back 401/403 and the document never loads. Fetching through the
  // signed route first and handing over an object URL is what
  // DocumentWorkspace already does -- see its blobUrlToPathname comment.
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
  const [srcError, setSrcError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    async function resolve() {
      if (!src) {
        setSrcError('No document.')
        return
      }
      const pathname = blobUrlToPathname(src)
      const signedPath = toSignedBlobPath(src)
      // Only legacy public blobs (e.g. user/*) can be fetched directly.
      if (!isPrivateBlobPath(pathname) && !signedPath) {
        setResolvedSrc(src)
        return
      }
      if (!signedPath) {
        setSrcError('Invalid document link.')
        return
      }
      try {
        const res = await fetch(signedPath, {
          credentials: 'include',
          headers: { Accept: 'application/pdf' },
        })
        if (cancelled) return
        if (!res.ok) {
          setSrcError(
            res.status === 403
              ? 'You do not have access to this document.'
              : 'Please sign in to view this document.',
          )
          return
        }
        objectUrl = URL.createObjectURL(await res.blob())
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        setResolvedSrc(objectUrl)
      } catch {
        if (!cancelled) setSrcError('Could not load this document.')
      }
    }

    void resolve()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: resolvedSrc ?? '' }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(InteractionManagerPluginPackage),
  createPluginRegistration(PanPluginPackage),
  createPluginRegistration(ZoomPluginPackage, { minZoom: 0.5, maxZoom: 2 }),
      // toleranceFactor: 0 requires exact glyph hits — dragging past the end of
      // a line no longer snaps to the last glyph, so highlight/strikeout boxes
      // only cover the text actually selected (not the whole line).
      createPluginRegistration(SelectionPluginPackage, { toleranceFactor: 0 }),
      createPluginRegistration(HistoryPluginPackage),
      createPluginRegistration(AnnotationPluginPackage, {
        annotationAuthor,
        // Read-only locks (same shape as student mode in DocumentWorkspace):
        // highlight/strikeout/freeText lose drag/resize, ink and sticky-note
        // (textComment) lose everything — a selected annotation can no longer
        // be moved through the plugin's own drag surface.
        tools: [
          {
            id: 'highlight',
            behavior: { useAppearanceStream: false, selectAfterCreate: true },
            interaction: { exclusive: false, isDraggable: !readOnly },
          },
          {
            id: 'strikeout',
            behavior: { useAppearanceStream: false, selectAfterCreate: true },
            interaction: { exclusive: false, isDraggable: !readOnly },
          },
          {
            id: 'freeText',
            behavior: { editAfterCreate: false, selectAfterCreate: true },
            clickBehavior: { enabled: false } as FreeTextClickBehavior,
            interaction: {
              exclusive: false,
              isDraggable: !readOnly,
              isResizable: !readOnly,
              isRotatable: false,
            },
          },
          // Read-only locks for tools without reviewer overrides above.
          ...(readOnly
            ? [
                {
                  id: 'ink',
                  interaction: {
                    exclusive: false,
                    isDraggable: false,
                    isResizable: false,
                    isRotatable: false,
                  },
                },
                {
                  id: 'textComment',
                  interaction: {
                    exclusive: false,
                    isDraggable: false,
                    isResizable: false,
                  },
                },
              ]
            : []),
        ],
      }),
    ],
    [resolvedSrc, annotationAuthor, readOnly],
  )

  if (srcError) {
    return (
      <div className="flex h-full w-full min-h-[480px] flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <TriangleAlert className="size-6 text-[#d97706]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          {srcError}
        </p>
      </div>
    )
  }

  // Nothing is registered until the Blob has been fetched, so the engine never
  // sees a URL it cannot load.
  if (!resolvedSrc) {
    return (
      <div className="flex h-full w-full min-h-[480px] flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <Loader2 className="size-6 animate-spin text-[#707dff]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          Loading document…
        </p>
      </div>
    )
  }

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
    <div className="h-full w-full min-h-[480px] overflow-hidden bg-[#fafbff]">
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) => {
          if (activeDocumentId) onActiveDocumentId?.(activeDocumentId)
          return activeDocumentId ? (
            <DocumentContent documentId={activeDocumentId}>
              {({ isLoaded, isLoading, isError }) => {
                // These three states used to be collapsed into `isLoaded &&`,
                // which rendered nothing at all -- so a document that failed to
                // load, or never finished, showed a blank panel with no way to
                // tell a slow load from a dead one. DocumentWorkspace already
                // spells all three out; this mirrors that.
                if (isError) {
                  return (
                    <div className="flex h-full w-full min-h-[480px] flex-col items-center justify-center gap-3 bg-[#fafbff]">
                      <TriangleAlert className="size-6 text-[#d97706]" />
                      <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
                        Failed to load this document.
                      </p>
                    </div>
                  )
                }
                if (isLoading || !isLoaded) {
                  return (
                    <div className="flex h-full w-full min-h-[480px] flex-col items-center justify-center gap-3 bg-[#fafbff]">
                      <Loader2 className="size-6 animate-spin text-[#707dff]" />
                      <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
                        Loading document…
                      </p>
                    </div>
                  )
                }
                return (
                  <>
                    <AnnotationHydrator
                      documentId={activeDocumentId}
                      initialAnnotations={initialAnnotations}
                    />
                    <GlobalPointerProvider documentId={activeDocumentId}>
                    <Viewport documentId={activeDocumentId}>
                      <ZoomGestureWrapper documentId={activeDocumentId} enablePinch enableWheel>
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
                      </ZoomGestureWrapper>
                    </Viewport>
                    </GlobalPointerProvider>
                  </>
                )
              }}
            </DocumentContent>
          ) : null
        }}
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