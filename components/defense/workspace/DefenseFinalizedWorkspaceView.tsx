'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Loader2, Lock, MessageSquareText, Pencil, TriangleAlert } from 'lucide-react'
import { createPluginRegistration } from '@embedpdf/core'
import { EmbedPDF } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { DocumentContent, DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/react'
import { Viewport, ViewportPluginPackage } from '@embedpdf/plugin-viewport/react'
import { Scroller, ScrollPluginPackage, useScroll } from '@embedpdf/plugin-scroll/react'
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react'
import { PagePointerProvider, InteractionManagerPluginPackage } from '@embedpdf/plugin-interaction-manager/react'
import { SelectionLayer, SelectionPluginPackage } from '@embedpdf/plugin-selection/react'
import { HistoryPluginPackage } from '@embedpdf/plugin-history/react'
import { AnnotationLayer, AnnotationPluginPackage, useAnnotation } from '@embedpdf/plugin-annotation/react'
import type { AnnotationTransferItem } from '@embedpdf/plugin-annotation'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import { StatusPill } from '@/components/defense/DefenseDocumentCard/StatusPill'
import { deserializeAnnotations } from '@/lib/annotations-serializer'
import type { SubmissionMeta } from '@/types/milestones'
import { DefenseDocumentWorkspace } from '@/components/defense/workspace/DefenseDocumentWorkspace'
import { WorkspacePanel } from '@/components/defense/workspace/WorkspacePanel'
import { ZoomControl } from '@/components/defense/workspace/ZoomControl'
import { AnnotationDedupe } from '@/components/defense/workspace/AnnotationDedupe'

export interface DefenseFinalizedWorkspaceViewProps {
  /** Submission metadata (status is APPROVED / NEEDS_REVISION / IN_REVIEW for defense mapping). Extra version/isInitial/verdict helps robust resubmission detection and verdict pill. */
  submission: SubmissionMeta & { scheduleId?: number; isInitial?: boolean; version?: number; verdict?: string }
  /** Committed annotations (serialized AnnotationTransferItem[] JSON). */
  initialAnnotations: unknown[] | null
  /**
   * True when this tab opens a SUPERSEDED (soft-deleted) version rather than
   * the current submission — the banner wording adapts.
   */
  isSuperseded?: boolean
  /** Back-link target — defaults to the defense session or list. */
  backHref?: string
  /** Defense schedule id for fallback backHref (/faculty/defense/[scheduleId]). */
  scheduleId?: number
  /** Draft status of the viewer's own annotation row — COMMITTED enables re-edit via Annotate. */
  draftStatus?: 'DRAFT' | 'COMMITTED' | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function FinalizedBadge({ isSuperseded }: { isSuperseded: boolean }) {
  return (
    <span className="flex items-center gap-[6px] h-[32px] px-[12px] rounded-[8px] bg-[#f4f5fc] border border-[#e0e3f0] font-sans font-semibold text-[11.5px] leading-[17px] text-[#5a6382]">
      <Lock className="size-[12px] text-[#9ea8c6]" strokeWidth={2.25} />
      {isSuperseded ? 'Previous version — read-only' : 'Defense annotation saved'}
    </span>
  )
}

function AnnotateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[6px] h-[32px] px-[14px] rounded-[8px] bg-[#707dff] font-sans font-bold text-[11.5px] leading-[17px] text-white hover:bg-[#5565ff] transition-colors focus-visible:ring-2 focus-visible:ring-[rgba(112,125,255,0.4)] outline-none shrink-0"
    >
      <Pencil className="size-[13px]" strokeWidth={2} />
      Annotate
    </button>
  )
}

function ReadOnlyCommentCard({
  item,
  onClick,
}: {
  item: unknown
  onClick?: () => void
}) {
  const ann = (item as unknown as { annotation?: Record<string, unknown> }).annotation as
    | { type?: number; author?: string; contents?: string; pageIndex?: number; id?: string }
    | undefined
  const author = (ann?.author as string)?.trim() || 'Unknown'
  const contents = (ann?.contents as string)?.trim() || ''
  const pageIndex = typeof ann?.pageIndex === 'number' ? ann.pageIndex + 1 : null
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left border border-[#eceef8] rounded-[9px] px-[14px] pt-[12px] pb-[12px] hover:bg-[#fafbff] hover:border-[#e5e8ff] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none"
    >
      <div className="flex items-center gap-[8px] min-w-0">
        <span className="flex items-center justify-center size-[26px] rounded-[8px] bg-[#f4f6ff] border border-[#e5e8ff] shrink-0">
          <MessageSquareText className="size-[13px] text-[#707dff]" strokeWidth={2} />
        </span>
        <p className="shrink-0 font-sans font-bold text-[12.5px] leading-[18.75px] text-[#3d4566]">Comment</p>
        {pageIndex != null && (
          <span className="shrink-0 bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff]">
            Page {pageIndex}
          </span>
        )}
        <div className="flex-1" />
        <p className="truncate font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">{author}</p>
      </div>
      <p className="pt-[8px] font-sans font-medium text-[12px] leading-[18px] text-[#5a6382] text-left">
        {contents || 'No text — annotation on page.'}
      </p>
    </button>
  )
}

function ReadOnlyCommentsPanel({
  documentId,
  annotations,
  onClose,
}: {
  documentId: string
  annotations: unknown[]
  onClose: () => void
}) {
  const { provides: annotationProvides } = useAnnotation(documentId)
  const scroll = useScroll(documentId)

  function handleCommentClick(item: unknown) {
    const ann = (item as unknown as { annotation?: { pageIndex?: number; id?: string } }).annotation
    const pageIndex = typeof ann?.pageIndex === 'number' ? ann.pageIndex : 0
    const id = typeof ann?.id === 'string' ? ann.id : ''
    if (annotationProvides) {
      try {
        annotationProvides.selectAnnotation(pageIndex, id)
      } catch {}
    }
    const scrollProvides = (scroll as unknown as { provides?: { scrollToPage?: (opts: { pageNumber: number; behavior?: string; alignY?: number }) => void } })?.provides
    if (scrollProvides?.scrollToPage) {
      try {
        scrollProvides.scrollToPage({ pageNumber: pageIndex + 1, behavior: 'smooth', alignY: 25 })
      } catch {}
    } else {
      const pageEl = document.querySelector(`[data-page-index="${pageIndex}"]`)
      if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <WorkspacePanel
      title="Comments"
      subtitle="Click a comment to jump to its annotation."
      count={annotations.length}
      onClose={onClose}
    >
      {annotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-[8px] py-[24px]">
          <div className="size-[40px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
            <MessageSquareText className="size-[18px] text-[#c4cadf]" strokeWidth={1.75} />
          </div>
          <p className="pt-[8px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">No comments yet</p>
          <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px]">Annotations you saved will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {annotations.map((item, idx) => (
            <ReadOnlyCommentCard
              key={(item as unknown as { annotation?: { id?: string } }).annotation?.id ?? String(idx)}
              item={item}
              onClick={() => handleCommentClick(item)}
            />
          ))}
        </div>
      )}
    </WorkspacePanel>
  )
}

function AnnotationHydrator({
  documentId,
  initialAnnotations,
}: {
  documentId: string
  initialAnnotations?: AnnotationTransferItem[]
}) {
  const { provides } = useAnnotation(documentId)
  const importedRef = useRef(false)
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

/**
 * Read-only view of a FINALIZED defense annotation.
 *
 * The panelist can no longer edit anything — the committed annotations are
 * rendered inside the defense PdfViewer with all pointer interaction disabled
 * (see the `.read-only` rule in globals.css), mirroring what students see.
 * No toolbar, no draft auto-save, no save actions.
 *
 * Gating (route layer): `!isCurrent || status !== 'PENDING'` routes to this
 * view — mirrors evaluation page gating. Superseded versions are always
 * read-only; the current version is read-only once status is not PENDING
  * (e.g. APPROVED / REDEFENSE / COMMITTED).
 *
 * Re-edit flow: when the panelist has a COMMITTED annotation on the current
 * version (`!isSuperseded && draftStatus === 'COMMITTED' && status === 'IN_REVIEW'`)
 * the header shows an Annotate button next to the Lock badge. Clicking it
 * toggles this component into edit mode by rendering the full
 * DefenseDocumentWorkspace (same toolbar, useAnnotationDraft, DeleteKey, etc.)
 * so the panelist can edit and Save again. Historical superseded versions
 * never show the button — they stay truly read-only.
 */
export function DefenseFinalizedWorkspaceView({
  submission,
  initialAnnotations,
  isSuperseded = false,
  backHref,
  scheduleId,
  draftStatus = null,
}: DefenseFinalizedWorkspaceViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showComments, setShowComments] = useState(false)

  const annotations = deserializeAnnotations(initialAnnotations ?? [])
  // Robust resubmission check: isInitial===false is primary, version>1 is fallback for legacy rows missing isInitial.
  const isResubmission =
    (submission as unknown as { isInitial?: boolean }).isInitial === false ||
    (typeof (submission as unknown as { version?: number }).version === 'number' &&
      (submission as unknown as { version?: number }).version! > 1)
  const resolvedBackHref =
    backHref ??
    (scheduleId
      ? `/faculty/defense/${scheduleId}/${isResubmission ? 'resubmission' : 'session'}`
      : submission.scheduleId
        ? `/faculty/defense/${submission.scheduleId}/${isResubmission ? 'resubmission' : 'session'}`
        : '/faculty/defense')
  // Only the current COMMITTED IN_REVIEW version is re-editable. Superseded
  // (historical) versions and non-IN_REVIEW (APPROVED/NEEDS_REVISION) stay
  // strictly read-only — no Annotate affordance. Resubmissions use Approve/Request Revision flow, not Annotate.
  const canAnnotate =
    !isResubmission && !isSuperseded && draftStatus === 'COMMITTED' && submission.status === 'IN_REVIEW'

  const { engine, isLoading, error } = usePdfiumEngine()
  const annotationAuthor = submission.reviewedBy ?? 'Panelist'
  // Read-only must fully disable drag/resize/rotate for ALL annotation tools
  // (pen/ink and freeText were still movable because the plugin defaults are draggable).
  // We mirror the student-mode overrides here and keep isDraggable false for every tool.
  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: submission.blobUrl }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(SelectionPluginPackage, { toleranceFactor: 0 }),
      createPluginRegistration(HistoryPluginPackage),
      createPluginRegistration(AnnotationPluginPackage, {
        annotationAuthor,
        tools: [
          {
            id: 'highlight',
            interaction: { exclusive: false, isDraggable: false, isResizable: false, isRotatable: false },
          },
          {
            id: 'strikeout',
            interaction: { exclusive: false, isDraggable: false, isResizable: false, isRotatable: false },
          },
          {
            id: 'freeText',
            interaction: { exclusive: false, isDraggable: false, isResizable: false, isRotatable: false },
          },
          {
            id: 'ink',
            interaction: { exclusive: false, isDraggable: false, isResizable: false, isRotatable: false },
          },
          {
            id: 'textComment',
            interaction: { exclusive: false, isDraggable: false, isResizable: false, isRotatable: false },
          },
        ],
      }),
    ],
    [submission.blobUrl, annotationAuthor],
  )

  if (isEditing && canAnnotate) {
    return (
      <DefenseDocumentWorkspace
        blobUrl={submission.blobUrl}
        submission={submission}
        initialAnnotations={initialAnnotations as unknown[]}
        draftStatus={draftStatus}
        backHref={resolvedBackHref}
        scheduleId={scheduleId ?? submission.scheduleId}
      />
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <TriangleAlert className="size-6 text-[#d97706]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">Failed to load the PDF engine.</p>
      </div>
    )
  }

  if (isLoading || !engine) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <Loader2 className="size-6 animate-spin text-[#707dff]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">Loading PDF engine…</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#fafbff]">
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) => (
          <>
            {/* Header bar: back + context | finalized notice + zoom centered in action toolbar */}
            <header className="relative flex items-center gap-[14px] px-6 h-[64px] bg-white border-b border-[#eceef8] shrink-0">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {activeDocumentId && <ZoomControl documentId={activeDocumentId} />}
              </div>
              <Link
                href={resolvedBackHref}
                className="flex items-center gap-[6px] h-[32px] px-[10px] rounded-[8px] font-sans font-semibold text-[11.5px] leading-[17px] text-[#5a6382] hover:bg-gray-50 hover:text-[#3d4566] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none shrink-0"
              >
                <ArrowLeft className="size-[14px]" strokeWidth={2} />
                Back
              </Link>

              <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />

              <div className="min-w-0 flex items-center gap-[10px]">
                <div className="min-w-0">
                  <p className="truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                    {submission.groupName}
                  </p>
                  <p className="truncate font-sans font-medium text-[11px] leading-[16.5px] text-[#8a93b4]">
                    {submission.chapter}
                  </p>
                </div>
                {(submission as unknown as { isInitial?: boolean; verdict?: string }).isInitial &&
                (submission as unknown as { verdict?: string }).verdict &&
                (submission as unknown as { verdict?: string }).verdict !== 'PENDING' ? (
                  <StatusPill state={(submission as unknown as { verdict: string }).verdict} />
                ) : (
                  <SubmissionStatusBadge status={submission.status} />
                )}
              </div>

              <div className="flex-1" />

              {/* Finalized notice + comments + optional re-edit — zoom is centered in header, not here. For resubmissions hide Defense annotation saved + Annotate (resub uses Approve/Request Revision). */}
              <div className="flex items-center gap-[8px] shrink-0">
                {!isResubmission && <FinalizedBadge isSuperseded={isSuperseded} />}
                <button
                  type="button"
                  onClick={() => setShowComments((v) => !v)}
                  aria-pressed={showComments}
                  className={`flex items-center gap-[6px] h-[32px] px-[12px] rounded-[8px] font-sans font-semibold text-[11.5px] leading-[17px] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none ${
                    showComments
                      ? 'bg-[#f4f6ff] border border-[#e5e8ff] text-[#707dff]'
                      : 'bg-white border border-[#e8ebf8] text-[#5a6382] hover:bg-gray-50'
                  }`}
                >
                  <MessageSquareText className="size-[13px]" strokeWidth={1.75} />
                  Comments
                </button>
                {!isResubmission && canAnnotate && <AnnotateButton onClick={() => setIsEditing(true)} />}
                {submission.reviewedAt && (
                  <span className="flex items-center gap-[6px] font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
                    <CalendarDays className="size-[12px] text-[#9ea8c6]" strokeWidth={1.75} />
                    Reviewed {formatDate(submission.reviewedAt)}
                    {submission.reviewedBy ? ` by ${submission.reviewedBy}` : ''}
                  </span>
                )}
              </div>
            </header>

            {activeDocumentId && <AnnotationDedupe documentId={activeDocumentId} />}

            {submission.reviewNote && (
              <div className="px-6 py-[10px] bg-[rgba(245,158,11,0.06)] border-b border-[rgba(245,158,11,0.18)] shrink-0">
                <p className="font-sans font-medium text-[12px] leading-[18px] text-[#92610a]">
                  Revision note: {submission.reviewNote}
                </p>
              </div>
            )}

            {/* Read-only viewer + inline comments panel */}
            <div className="flex-1 min-h-0 flex">
              <div className="flex-1 min-h-0 relative bg-[#e8eaf4] epdf-viewer-area read-only border border-[#d8daf0] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
                {activeDocumentId ? (
                  <DocumentContent documentId={activeDocumentId}>
                    {({ isLoaded, isLoading, isError }) => {
                      if (isError) {
                        return (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#fafbff]">
                            <TriangleAlert className="size-6 text-[#d97706]" />
                            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">Failed to load this document.</p>
                          </div>
                        )
                      }
                      if (isLoading || !isLoaded) {
                        return (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#fafbff]">
                            <Loader2 className="size-6 animate-spin text-[#707dff]" />
                            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">Loading document…</p>
                          </div>
                        )
                      }
                      return (
                        <>
                          <AnnotationHydrator documentId={activeDocumentId} initialAnnotations={annotations as unknown as AnnotationTransferItem[]} />
                          <Viewport documentId={activeDocumentId}>
                            <Scroller
                              documentId={activeDocumentId}
                              renderPage={({ width, height, pageIndex }) => (
                                <div style={{ width, height }}>
                                  <PagePointerProvider documentId={activeDocumentId} pageIndex={pageIndex}>
                                    <RenderLayer documentId={activeDocumentId} pageIndex={pageIndex} draggable={false} />
                                    <SelectionLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                                    <AnnotationLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                                  </PagePointerProvider>
                                </div>
                              )}
                            />
                          </Viewport>
                        </>
                      )
                    }}
                  </DocumentContent>
                ) : null}
              </div>
              {showComments && activeDocumentId && (
                <ReadOnlyCommentsPanel
                  documentId={activeDocumentId}
                  annotations={annotations}
                  onClose={() => setShowComments(false)}
                />
              )}
            </div>
          </>
        )}
      </EmbedPDF>
    </div>
  )
}
