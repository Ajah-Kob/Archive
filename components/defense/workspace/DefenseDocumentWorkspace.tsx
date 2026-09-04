'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  Check,
  FileText,
  History,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Save,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createPluginRegistration } from '@embedpdf/core'
import { EmbedPDF } from '@embedpdf/core/react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { DocumentContent } from '@embedpdf/plugin-document-manager/react'
import {
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
  AnnotationPluginPackage,
  useAnnotation,
  useAnnotationCapability,
} from '@embedpdf/plugin-annotation/react'
import { AnnotationLayerWithDrag } from '@/components/defense/workspace/AnnotationLayerWithDrag'
import type { AnnotationTransferItem } from '@embedpdf/plugin-annotation'
import type { FreeTextClickBehavior } from '@embedpdf/plugin-annotation'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import { serializeAnnotations } from '@/lib/annotations-serializer'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import { AnnotationToolbar } from '@/components/defense/workspace/AnnotationToolbar'
import type { ToolId } from '@/components/defense/workspace/AnnotationToolbar'
import { ToolSettingsPanel } from '@/components/defense/workspace/ToolSettingsPanel'
import { AnnotationDedupe } from '@/components/defense/workspace/AnnotationDedupe'
import { AnnotationEmptyGuard } from '@/components/defense/workspace/AnnotationEmptyGuard'
import { AnnotationHover } from '@/components/defense/workspace/AnnotationHover'
import { AnnotationDeleteKey } from '@/components/defense/workspace/AnnotationDeleteKey'
import { DisableTextSelection } from '@/components/defense/workspace/DisableTextSelection'
import { UndoRedo } from '@/components/defense/workspace/UndoRedo'
import { ZoomControl } from '@/components/defense/workspace/ZoomControl'
import { DefenseCommentsPanel } from '@/components/defense/workspace/DefenseCommentsPanel'
import { DefenseSaveConfirmModal } from '@/components/defense/workspace/DefenseSaveConfirmModal'
import type { AnnotationSummary } from '@/components/defense/workspace/DefenseSaveConfirmModal'
import { DefenseResubmissionVerdictModal } from '@/components/defense/workspace/DefenseResubmissionVerdictModal'
import { useAnnotationDraft } from '@/components/defense/workspace/useAnnotationDraft'
import type { AnnotationDraftStatus } from '@/components/defense/workspace/useAnnotationDraft'
import { isReviewAnnotation } from '@/components/defense/workspace/review-annotations'
import { VersionPanel } from '@/components/defense/workspace/VersionPanel'
import type { StudentVersionListItem } from '@/lib/actions/student-review'
import type { SubmissionMeta } from '@/types/milestones'

/** Who is viewing the workspace: the panelist (full editing) or a student (read-only). */
export type DefenseWorkspaceMode = 'reviewer' | 'student'
/** Alias kept for consumers that import `WorkspaceMode` from defense workspace. */
export type WorkspaceMode = DefenseWorkspaceMode

export interface DefenseDocumentWorkspaceProps {
  /** Viewer mode — student strips every editing affordance and write path. */
  mode?: DefenseWorkspaceMode
  /** Public Vercel Blob URL of the submission's document. */
  blobUrl: string
  /** Submission metadata for the header + detail. Extended with optional scheduleId/isInitial for defense redirect. */
  submission: SubmissionMeta & { scheduleId?: number; isInitial?: boolean }
  /** Saved annotation rows (serialized AnnotationTransferItem[]) for this submission. */
  initialAnnotations: unknown[] | null
  /** Persistence status of the saved annotation row, if any. */
  draftStatus: 'DRAFT' | 'COMMITTED' | null
  /** Version list for the student Version panel (student mode only). */
  versions?: StudentVersionListItem[]
  /** Back-link target (defaults to the defense session / list). */
  backHref?: string
  /** Defense schedule id for post-save redirect. Falls back to submission.scheduleId. */
  scheduleId?: number
}

/** Which right slide-over panel is open (if any). */
type PanelId = 'comments' | 'versions'

/** Save payload captured at Save click time. */
interface SaveState {
  summary: AnnotationSummary
  data: unknown | null
}

/** Resubmission verdict payload captured at Approve/Request click time. */
interface ResubmissionVerdictState {
  decision: 'APPROVED' | 'REJECTED'
  summary: AnnotationSummary
  data: unknown | null
}

/** Stable document id for the single document open in this workspace. */
const CURRENT_DOCUMENT_ID = 'submission-current'

const SUBTYPE_TO_SUMMARY_KEY: Partial<
  Record<PdfAnnotationSubtype, keyof AnnotationSummary>
> = {
  [PdfAnnotationSubtype.HIGHLIGHT]: 'highlight',
  [PdfAnnotationSubtype.TEXT]: 'text',
  [PdfAnnotationSubtype.INK]: 'ink',
  [PdfAnnotationSubtype.FREETEXT]: 'freeText',
  [PdfAnnotationSubtype.STRIKEOUT]: 'strikeout',
}

const SUBTYPE_TO_TOOL: Partial<Record<PdfAnnotationSubtype, ToolId>> = {
  [PdfAnnotationSubtype.HIGHLIGHT]: 'highlight',
  [PdfAnnotationSubtype.STRIKEOUT]: 'strikeout',
  [PdfAnnotationSubtype.INK]: 'ink',
  [PdfAnnotationSubtype.FREETEXT]: 'freeText',
}

function summarizeAnnotations(items: unknown[]): AnnotationSummary {
  const summary: AnnotationSummary = {}
  for (const item of items) {
    const type = (item as { annotation?: { type?: PdfAnnotationSubtype } })
      .annotation?.type
    const key = type ? SUBTYPE_TO_SUMMARY_KEY[type] : undefined
    if (key) summary[key] = (summary[key] ?? 0) + 1
  }
  return summary
}

/**
 * Defense document review workspace — ONE specific document version per
 * browser tab. Panelist-editable when `mode === 'reviewer'` (status PENDING &
 * isCurrent gating lives in the route; this component is purely viewer-mode).
 *
 * This is a defense-namespace copy of `components/evaluation/workspace/DocumentWorkspace.tsx`
 * preserving every feature (header, draft status, toolbar, zoom, undo/redo,
 * panels, annotation behaviors) except the verdict actions — replaced by a
 * single Save annotation button that opens DefenseSaveConfirmModal.
 *
 * The ENTIRE layout lives inside a single `<EmbedPDF>` root so every child
 * (header toolbar, panels) can use the plugin hooks.
 */
export function DefenseDocumentWorkspace({
  mode = 'reviewer',
  blobUrl,
  submission,
  initialAnnotations,
  draftStatus,
  versions,
  backHref,
  scheduleId,
}: DefenseDocumentWorkspaceProps) {
  const isStudent = mode === 'student'
  const { engine, isLoading, error } = usePdfiumEngine()
  const { data: session } = useSession()

  const annotationAuthor = session?.user?.name ?? 'Panelist'

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: blobUrl, documentId: CURRENT_DOCUMENT_ID }],
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
            behavior: { useAppearanceStream: false, selectAfterCreate: true },
            interaction: { exclusive: false, isDraggable: !isStudent },
          },
          {
            id: 'strikeout',
            behavior: { useAppearanceStream: false, selectAfterCreate: true },
            interaction: { exclusive: false, isDraggable: !isStudent },
          },
          {
            id: 'freeText',
            behavior: { editAfterCreate: false, selectAfterCreate: true },
            clickBehavior: { enabled: false } as FreeTextClickBehavior,
            interaction: {
              exclusive: false,
              isDraggable: !isStudent,
              isResizable: !isStudent,
              isRotatable: false,
            },
          },
          ...(isStudent
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
    [blobUrl, annotationAuthor, isStudent],
  )

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <TriangleAlert className="size-6 text-[#d97706]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          Failed to load the PDF engine.
        </p>
      </div>
    )
  }

  if (isLoading || !engine) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#fafbff]">
        <Loader2 className="size-6 animate-spin text-[#707dff]" />
        <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
          Loading PDF engine…
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#fafbff]">
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) => (
          <DefenseWorkspaceLayout
            mode={mode}
            activeDocumentId={activeDocumentId}
            submission={submission}
            initialAnnotations={initialAnnotations}
            draftStatus={draftStatus}
            versions={versions}
            backHref={backHref}
            scheduleId={scheduleId}
          />
        )}
      </EmbedPDF>
    </div>
  )
}

function DefenseWorkspaceLayout({
  mode = 'reviewer',
  activeDocumentId,
  submission,
  initialAnnotations,
  draftStatus,
  versions,
  backHref,
  scheduleId,
}: {
  mode?: DefenseWorkspaceMode
  activeDocumentId: string | null
  submission: SubmissionMeta & { scheduleId?: number; isInitial?: boolean }
  initialAnnotations: unknown[] | null
  draftStatus: 'DRAFT' | 'COMMITTED' | null
  versions?: StudentVersionListItem[]
  backHref?: string
  scheduleId?: number
}) {
  const isStudent = mode === 'student'
  const router = useRouter()
  const viewerRef = useRef<HTMLDivElement>(null)

  const pendingCommentIdsRef = useRef<Set<string>>(new Set())
  const { status: liveDraftStatus } = useAnnotationDraft({
    submissionId: submission.id,
    documentId: CURRENT_DOCUMENT_ID,
    initialAnnotations: (initialAnnotations ?? []) as AnnotationTransferItem[],
    excludeIdsRef: pendingCommentIdsRef,
    enabled: !isStudent,
  })

  const { state: annotationState, provides: annotationApi } = useAnnotation(
    CURRENT_DOCUMENT_ID,
  )
  const hasAnnotations = Object.keys(annotationState.byUid).length > 0

  const [seededDraftStatus] = useState<AnnotationDraftStatus>(() =>
    draftStatus === 'DRAFT' || draftStatus === 'COMMITTED' ? 'saved' : 'idle',
  )
  const draftSaveStatus: AnnotationDraftStatus =
    liveDraftStatus === 'idle' ? seededDraftStatus : liveDraftStatus

  const { provides: annotationCapability } = useAnnotationCapability()
  const annotationCapabilityRef = useRef(annotationCapability)
  annotationCapabilityRef.current = annotationCapability

  const [panel, setPanel] = useState<PanelId | null>(null)
  const [saveState, setSaveState] = useState<SaveState | null>(null)
  const [resubmissionVerdict, setResubmissionVerdict] = useState<ResubmissionVerdictState | null>(null)
  const isResubmission = (submission as unknown as { isInitial?: boolean }).isInitial === false

  const [activeTool, setActiveTool] = useState<ToolId | null>(null)

  const [autoEditId, setAutoEditId] = useState<string | null>(null)
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null)
  const inlineToolArmedRef = useRef(false)

  function handleSelectAnnotation(annotationId: string) {
    setAutoEditId(null)
    setHighlightCommentId(annotationId)
    setPanel('comments')
  }

  function handleDeselectAnnotation() {
    annotationApi?.selectAnnotation(-1, '')
    setOpenMenuId(null)
  }

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  function handleActiveToolChange(tool: ToolId | null) {
    setActiveTool(tool)
    if (tool === 'highlight' || tool === 'strikeout') {
      inlineToolArmedRef.current = true
    }
  }

  useEffect(() => {
    const uid = annotationState.selectedUid
    if (!uid) return
    const type = annotationState.byUid[uid]?.object?.type
    if (type === undefined) return
    const tool = SUBTYPE_TO_TOOL[type as PdfAnnotationSubtype]
    if (!tool || tool === activeTool) return
    handleActiveToolChange(tool)
    annotationApi?.setActiveTool(tool)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotationState.selectedUid, annotationState.byUid])

  useEffect(() => {
    if (!annotationCapability) return
    const unsubscribe = annotationCapability.onAnnotationEvent((event) => {
      if (event.type !== 'create' || !event.committed) return
      if (event.documentId !== activeDocumentId) return

      annotationApi?.selectAnnotation(
        event.annotation.pageIndex,
        event.annotation.id,
      )
      setOpenMenuId(event.annotation.id)

      const type = event.annotation.type
      if (
        type !== PdfAnnotationSubtype.HIGHLIGHT &&
        type !== PdfAnnotationSubtype.STRIKEOUT
      ) {
        return
      }
      if (!inlineToolArmedRef.current) return
      inlineToolArmedRef.current = false
      pendingCommentIdsRef.current.add(event.annotation.id)
      setPanel('comments')
      setAutoEditId(event.annotation.id)
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [annotationCapability, activeDocumentId])

  function handleSaveComment(comment: { id: string }) {
    pendingCommentIdsRef.current.delete(comment.id)
  }

  function handleCancelEdit(comment: { id: string; pageIndex: number }) {
    if (!pendingCommentIdsRef.current.has(comment.id)) return
    pendingCommentIdsRef.current.delete(comment.id)
    annotationCapabilityRef.current?.deleteAnnotation(comment.pageIndex, comment.id)
  }

  function discardPendingAnnotations() {
    const cap = annotationCapabilityRef.current
    if (!cap) return
    const state = cap.getState()
    for (const id of pendingCommentIdsRef.current) {
      for (const [pageKey, uids] of Object.entries(state.pages)) {
        if (uids.includes(id)) {
          cap.deleteAnnotation(Number(pageKey), id)
          break
        }
      }
    }
    pendingCommentIdsRef.current.clear()
  }

  async function openSave() {
    const cap = annotationCapabilityRef.current
    let data: unknown = null
    let summary: AnnotationSummary = {}
    if (cap) {
      await cap.exportAnnotations(undefined, CURRENT_DOCUMENT_ID).wait(
        (items) => {
          const reviewItems = items.filter((item) =>
            isReviewAnnotation(item.annotation),
          )
          if (reviewItems.length === 0) return
          const serialized = serializeAnnotations(reviewItems)
          data = serialized
          summary = summarizeAnnotations(serialized)
        },
        (error) => {
          console.error('[DefenseDocumentWorkspace] exportAnnotations failed:', error)
        },
      )
    }
    setSaveState({ summary, data })
  }

  async function openResubmissionVerdict(decision: 'APPROVED' | 'REJECTED') {
    const cap = annotationCapabilityRef.current
    let data: unknown = null
    let summary: AnnotationSummary = {}
    if (cap) {
      await cap.exportAnnotations(undefined, CURRENT_DOCUMENT_ID).wait(
        (items) => {
          const reviewItems = items.filter((item) => isReviewAnnotation(item.annotation))
          if (reviewItems.length === 0) return
          const serialized = serializeAnnotations(reviewItems)
          data = serialized
          summary = summarizeAnnotations(serialized)
        },
        (error) => {
          console.error('[DefenseDocumentWorkspace] exportAnnotations failed:', error)
        },
      )
    }
    setResubmissionVerdict({ decision, summary, data })
  }

  function handleViewerPointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement
    if (target.closest('[data-no-interaction]')) return
    annotationCapabilityRef.current?.deselectAnnotation()
    setHighlightCommentId(null)
  }

  const resolvedScheduleId = scheduleId ?? submission.scheduleId ?? null
  const resolvedBackHref =
    backHref ??
    (resolvedScheduleId ? `/faculty/defense/${resolvedScheduleId}` : '/faculty/defense')

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      {activeDocumentId && <AnnotationDedupe documentId={activeDocumentId} />}

      {!isStudent && activeDocumentId && (
        <>
          <AnnotationEmptyGuard documentId={activeDocumentId} />
          <AnnotationDeleteKey documentId={activeDocumentId} />
        </>
      )}

      {activeDocumentId && <DisableTextSelection documentId={activeDocumentId} />}

      <header className="flex items-center gap-[14px] px-6 h-[64px] bg-white border-b border-[#eceef8] shrink-0">
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
          <SubmissionStatusBadge status={submission.status} />
        </div>

        {!isStudent && (
          <div className="flex items-center gap-[7px] min-w-0 shrink-0">
            {draftSaveStatus === 'saving' ? (
              <>
                <Loader2
                  className="size-[12px] animate-spin text-[#8a93b4] shrink-0"
                  aria-hidden="true"
                />
                <span
                  className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]"
                  aria-live="polite"
                >
                  Saving…
                </span>
              </>
            ) : (
              <span
                className="flex items-center gap-[6px] font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]"
                aria-live="polite"
              >
                <Check
                  className={`size-[12px] shrink-0 ${
                    draftSaveStatus === 'saved' ? 'text-[#16a34a]' : 'text-[#9ea8c6]'
                  }`}
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                {draftSaveStatus === 'saved' ? 'Draft Saved' : 'Draft Saved'}
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {!isStudent && activeDocumentId && (
          <AnnotationToolbar
            documentId={activeDocumentId}
            activeTool={activeTool}
            onActiveToolChange={handleActiveToolChange}
          />
        )}

        {!isStudent && <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />}

        {activeDocumentId && <ZoomControl documentId={activeDocumentId} />}

        {!isStudent && <UndoRedo />}

        <div className="flex-1" />

        <div className="flex items-center gap-[8px] shrink-0">
          <button
            type="button"
            onClick={() => setPanel(panel === 'comments' ? null : 'comments')}
            aria-pressed={panel === 'comments'}
            className={`flex items-center gap-[6px] h-[32px] px-[12px] rounded-[8px] font-sans font-semibold text-[11.5px] leading-[17px] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none ${
              panel === 'comments'
                ? 'bg-[#f4f6ff] border border-[#e5e8ff] text-[#707dff]'
                : 'bg-white border border-[#e8ebf8] text-[#5a6382] hover:bg-gray-50'
            }`}
          >
            <MessageSquareText className="size-[13px]" strokeWidth={1.75} />
            Comments
          </button>

          {isStudent && versions && versions.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setPanel(panel === 'versions' ? null : 'versions')}
                aria-pressed={panel === 'versions'}
                className={`flex items-center gap-[6px] h-[32px] px-[12px] rounded-[8px] font-sans font-semibold text-[11.5px] leading-[17px] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none ${
                  panel === 'versions'
                    ? 'bg-[#f4f6ff] border border-[#e5e8ff] text-[#707dff]'
                    : 'bg-white border border-[#e8ebf8] text-[#5a6382] hover:bg-gray-50'
                }`}
              >
                <History className="size-[13px]" strokeWidth={1.75} />
                Versions
              </button>
            </>
          )}

          {!isStudent && isResubmission ? (
            <>
              <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />
              <button
                type="button"
                onClick={() => openResubmissionVerdict('REJECTED')}
                disabled={!hasAnnotations}
                title={
                  hasAnnotations
                    ? 'Request revisions for this resubmission'
                    : 'Add annotations before requesting revisions'
                }
                className="flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[8px] bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] font-sans font-bold text-[11.5px] leading-[17px] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.14)] transition-colors focus-visible:ring-2 focus-visible:ring-[rgba(245,158,11,0.4)] outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[rgba(245,158,11,0.08)]"
              >
                <RotateCcw className="size-[13px]" />
                Request Revision
              </button>
              <button
                type="button"
                onClick={() => openResubmissionVerdict('APPROVED')}
                title="Approve this resubmission"
                className="flex items-center justify-center gap-[6px] h-[32px] px-[14px] rounded-[8px] bg-[#16a34a] font-sans font-bold text-[11.5px] leading-[17px] text-white hover:bg-[#15803d] transition-colors focus-visible:ring-2 focus-visible:ring-[rgba(22,163,74,0.4)] outline-none"
              >
                <Check className="size-[13px]" strokeWidth={2.5} />
                Approve
              </button>
            </>
          ) : (
            !isStudent && (
              <>
                <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />
                <button
                  type="button"
                  onClick={openSave}
                  disabled={!hasAnnotations}
                  title={
                    hasAnnotations
                      ? 'Save annotations for this defense submission'
                      : 'Add annotations before saving'
                  }
                  className="flex items-center justify-center gap-[6px] h-[32px] px-[14px] rounded-[8px] bg-[#707dff] font-sans font-bold text-[11.5px] leading-[17px] text-white hover:bg-[#5565ff] transition-colors focus-visible:ring-2 focus-visible:ring-[rgba(112,125,255,0.4)] outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#707dff]"
                >
                  <Save className="size-[13px]" strokeWidth={2} />
                  Save annotation
                </button>
              </>
            )
          )}
        </div>
      </header>

      {!isStudent && activeDocumentId && (
        <ToolSettingsPanel documentId={activeDocumentId} activeTool={activeTool} />
      )}

      <div className="flex-1 min-h-0 flex">
        <div
          ref={viewerRef}
          className="flex-1 min-h-0 relative bg-[#e8eaf4] epdf-viewer-area border border-[#d8daf0] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]"
          onPointerDownCapture={handleViewerPointerDown}
        >
          <div className="absolute inset-0 overflow-hidden">
            {activeDocumentId ? (
              <DocumentContent documentId={activeDocumentId}>
                {({ isLoaded, isLoading, isError }) => {
                  if (isError) {
                    return (
                      <ViewerState
                        icon={TriangleAlert}
                        message="Failed to load this document."
                      />
                    )
                  }
                  if (isLoading || !isLoaded) {
                    return (
                      <ViewerState
                        icon={Loader2}
                        message="Loading document…"
                        spin
                      />
                    )
                  }
                  return (
                    <Viewport documentId={activeDocumentId}>
                      <Scroller
                        documentId={activeDocumentId}
                        renderPage={({ width, height, pageIndex }) => (
                          <div
                            style={{ width, height }}
                            data-page-index={pageIndex}
                          >
                            <PagePointerProvider
                              documentId={activeDocumentId}
                              pageIndex={pageIndex}
                            >
                              <RenderLayer
                                documentId={activeDocumentId}
                                pageIndex={pageIndex}
                                draggable={false}
                              />
                              <SelectionLayer
                                documentId={activeDocumentId}
                                pageIndex={pageIndex}
                              />
                              <AnnotationLayerWithDrag
                                documentId={activeDocumentId}
                                pageIndex={pageIndex}
                                readOnly={isStudent}
                              />
                            </PagePointerProvider>
                          </div>
                        )}
                      />
                    </Viewport>
                  )
                }}
              </DocumentContent>
            ) : (
              <ViewerState icon={FileText} message="No document open." />
            )}
          </div>

          {activeDocumentId && (
            <AnnotationHover
              documentId={activeDocumentId}
              viewerRef={viewerRef}
              readOnly={isStudent}
              onSelectAnnotation={handleSelectAnnotation}
              onDeselectAnnotation={handleDeselectAnnotation}
              initialMenuId={openMenuId}
            />
          )}
        </div>

        {panel === 'comments' && activeDocumentId && (
          <DefenseCommentsPanel
            documentId={activeDocumentId}
            readOnly={isStudent}
            isStudent={isStudent}
            submissionId={submission.id}
            initialAnnotations={initialAnnotations as unknown[] | null}
            autoEditId={autoEditId}
            highlightId={highlightCommentId}
            onClose={() => {
              discardPendingAnnotations()
              setPanel(null)
              setAutoEditId(null)
              setHighlightCommentId(null)
            }}
            onCancelEdit={handleCancelEdit}
            onSaveComment={handleSaveComment}
          />
        )}
        {panel === 'versions' && isStudent && (
          <VersionPanel versions={versions ?? []} onClose={() => setPanel(null)} />
        )}
      </div>

      {saveState && !isResubmission && (
        <DefenseSaveConfirmModal
          submissionId={submission.id}
          scheduleId={resolvedScheduleId ?? undefined}
          annotationSummary={saveState.summary}
          annotationData={saveState.data}
          onClose={() => setSaveState(null)}
          onCommitted={() => {
            if (!resolvedScheduleId) return
            router.push(`/faculty/defense/${resolvedScheduleId}`)
          }}
        />
      )}
      {resubmissionVerdict && isResubmission && (
        <DefenseResubmissionVerdictModal
          submissionId={submission.id}
          scheduleId={resolvedScheduleId ?? undefined}
          decision={resubmissionVerdict.decision}
          annotationSummary={resubmissionVerdict.summary}
          annotationData={resubmissionVerdict.data}
          onClose={() => setResubmissionVerdict(null)}
          onCommitted={() => {
            if (!resolvedScheduleId) return
            router.push(`/faculty/defense/${resolvedScheduleId}`)
          }}
        />
      )}
    </div>
  )
}

function ViewerState({
  icon: Icon,
  message,
  spin = false,
}: {
  icon: LucideIcon
  message: string
  spin?: boolean
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#fafbff]">
      <Icon
        className={`size-6 ${spin ? 'animate-spin' : ''} ${
          spin ? 'text-[#707dff]' : 'text-[#d97706]'
        }`}
      />
      <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
        {message}
      </p>
    </div>
  )
}
