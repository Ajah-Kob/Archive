'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
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
} from '@embedpdf/plugin-annotation/react'
import { blobUrlToPathname, toSignedBlobPath } from '@/lib/blob'

export interface ArchivingPdfViewerProps {
  /** Private Vercel Blob URL (archiving/* or ArchivingSubmission.blobUrl / CapstoneArchive.blobUrl). Never rendered directly. */
  src: string
  /** File name for a11y / error context */
  fileName?: string
}

/**
 * Archiving PdfViewer — fetches via signed route /api/blob/archiving/... instead of raw blobUrl.
 *
 * DB still stores the full https://…vercel-storage.com/archiving/{groupId}/… URL, but
 * the client never puts that URL in an <a href> or <EmbedPDF src>. The pathname is
 * derived via `blobUrlToPathname` (new URL(blobUrl).pathname slice) and fetched
 * with credentials from the auth-gated route. 401/403 are surfaced with a toast
 * and an inline unauthorized state; the PDF is rendered via EmbedPDF from a
 * fetched object URL, not the raw public URL.
 *
 * Repository `archives/*` stays public (see lib/blob.ts + app/repository/page.tsx note)
 * and is intentionally NOT routed through this viewer.
 */
export function PdfViewer({ src, fileName }: ArchivingPdfViewerProps) {
  const { engine, isLoading: engineLoading, error: engineError } = usePdfiumEngine()

  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  // Derive signed route from stored blobUrl — never expose raw blobUrl in DOM.
  const signedPath = useMemo(() => toSignedBlobPath(src), [src])
  const pathname = useMemo(() => blobUrlToPathname(src), [src])

  useEffect(() => {
    let cancelled = false
    let currentObjectUrl: string | null = null

    async function load() {
      if (!src) {
        setFetchError('No document.')
        return
      }
      if (!signedPath || !pathname.startsWith('archiving/')) {
        setFetchError('Invalid document link.')
        return
      }
      setFetching(true)
      setFetchError(null)
      setObjectUrl(null)

      try {
        const res = await fetch(signedPath, {
          credentials: 'include',
          headers: { Accept: 'application/pdf' },
        })

        if (cancelled) return

        if (res.status === 401) {
          const msg = 'Please sign in to view this document.'
          setFetchError(msg)
          toast.error(msg)
          return
        }
        if (res.status === 403) {
          const msg = 'You do not have access to this document.'
          setFetchError(msg)
          toast.error(msg)
          return
        }
        if (!res.ok) {
          const msg = 'Failed to load document.'
          setFetchError(msg)
          toast.error(msg)
          return
        }

        // Route may 302 to a signed downloadUrl (fetch follows redirects) or
        // return JSON with { url, downloadUrl } when Accept is json. Handle both.
        const contentType = res.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
          try {
            const data = (await res.json()) as {
              url?: string
              downloadUrl?: string
            }
            const signedUrl = data.downloadUrl ?? data.url
            if (signedUrl) {
              // Fetch the signed URL's content
              const blobRes = await fetch(signedUrl, { credentials: 'include' })
              if (!blobRes.ok) {
                throw new Error(`Signed URL fetch failed: ${blobRes.status}`)
              }
              const blob = await blobRes.blob()
              const url = URL.createObjectURL(blob)
              if (cancelled) {
                URL.revokeObjectURL(url)
                return
              }
              currentObjectUrl = url
              setObjectUrl(url)
              return
            }
          } catch {
            // fall through to blob handling
          }
        }

        const blob = await res.blob()
        // If blob is actually JSON (application/json wrapped as blob), try to parse
        if (blob.type.includes('json')) {
          try {
            const text = await blob.text()
            const data = JSON.parse(text) as {
              url?: string
              downloadUrl?: string
            }
            const signedUrl = data.downloadUrl ?? data.url
            if (signedUrl) {
              const blobRes = await fetch(signedUrl, { credentials: 'include' })
              if (blobRes.ok) {
                const inner = await blobRes.blob()
                const url = URL.createObjectURL(inner)
                if (cancelled) {
                  URL.revokeObjectURL(url)
                  return
                }
                currentObjectUrl = url
                setObjectUrl(url)
                return
              }
            }
          } catch {
            // not json
          }
        }

        // Normal PDF blob
        const url = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        currentObjectUrl = url
        setObjectUrl(url)
      } catch (err) {
        if (cancelled) return
        console.error('[Archiving PdfViewer | fetch failed]:', err)
        const msg = 'Failed to load document. Please try again.'
        setFetchError(msg)
        toast.error(msg)
      } finally {
        if (!cancelled) setFetching(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedPath, pathname, src])

  // Cleanup on unmount / src change
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  if (engineError) {
    return (
      <div className="flex h-full w-full min-h-[480px] flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <TriangleAlert className="size-6 text-[#d97706]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          Failed to load the PDF engine.
        </p>
        {fileName && (
          <p className="font-sans text-[11px] text-[#9ea8c6]">{fileName}</p>
        )}
      </div>
    )
  }

  if (engineLoading || !engine || fetching) {
    return (
      <div className="flex h-full w-full min-h-[480px] flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <Loader2 className="size-6 animate-spin text-[#707dff]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          {fetching ? 'Loading document…' : 'Loading PDF engine…'}
        </p>
      </div>
    )
  }

  if (fetchError || !objectUrl) {
    return (
      <div className="flex h-full w-full min-h-[480px] flex-col items-center justify-center gap-3 bg-[#fafbff] px-6 text-center">
        <TriangleAlert className="size-6 text-[#d97706]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          {fetchError ?? 'Document unavailable.'}
        </p>
        {fileName && (
          <p className="font-sans text-[11px] text-[#9ea8c6] break-all">
            {fileName}
          </p>
        )}
        <p className="font-sans text-[11px] text-[#9ea8c6]">
          The file is stored as a private blob at{' '}
          <code className="rounded bg-[#f4f6ff] px-1 py-0.5 text-[#707dff]">
            {pathname || 'archiving/...'}
          </code>{' '}
          and is fetched via the signed route{' '}
          <code className="rounded bg-[#f4f6ff] px-1 py-0.5 text-[#707dff]">
            /api/blob/archiving/...
          </code>{' '}
          — not the raw blob URL.
        </p>
      </div>
    )
  }

  // Render PDF from fetched object URL (private, auth-gated), not raw blobUrl.
  const plugins = [
    createPluginRegistration(DocumentManagerPluginPackage, {
      initialDocuments: [{ url: objectUrl }],
    }),
    createPluginRegistration(ViewportPluginPackage),
    createPluginRegistration(ScrollPluginPackage),
    createPluginRegistration(RenderPluginPackage),
    createPluginRegistration(InteractionManagerPluginPackage),
    createPluginRegistration(SelectionPluginPackage, { toleranceFactor: 0 }),
    createPluginRegistration(HistoryPluginPackage),
    createPluginRegistration(AnnotationPluginPackage, {
      annotationAuthor: 'Archiving Viewer',
    }),
  ]

  return (
    <div className="h-full w-full min-h-[480px] overflow-hidden bg-[#e8eaf4] relative">
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) =>
          activeDocumentId && (
            <DocumentContent documentId={activeDocumentId}>
              {({ isLoaded }) =>
                isLoaded && (
                  <Viewport documentId={activeDocumentId}>
                    <Scroller
                      documentId={activeDocumentId}
                      renderPage={({ width, height, pageIndex }) => (
                        <div style={{ width, height }}>
                          <PagePointerProvider
                            documentId={activeDocumentId}
                            pageIndex={pageIndex}
                          >
                            <RenderLayer
                              documentId={activeDocumentId}
                              pageIndex={pageIndex}
                            />
                            <SelectionLayer
                              documentId={activeDocumentId}
                              pageIndex={pageIndex}
                            />
                            <AnnotationLayer
                              documentId={activeDocumentId}
                              pageIndex={pageIndex}
                            />
                          </PagePointerProvider>
                        </div>
                      )}
                    />
                  </Viewport>
                )
              }
            </DocumentContent>
          )
        }
      </EmbedPDF>
    </div>
  )
}

export default PdfViewer
