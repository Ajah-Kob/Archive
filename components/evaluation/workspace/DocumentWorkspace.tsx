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
import { AnnotationLayerWithDrag } from '@/components/evaluation/workspace/AnnotationLayerWithDrag'
import type { AnnotationTransferItem } from '@embedpdf/plugin-annotation'
import type { FreeTextClickBehavior } from '@embedpdf/plugin-annotation'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import { serializeAnnotations } from '@/lib/annotations-serializer'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import { AnnotationToolbar } from '@/components/evaluation/workspace/AnnotationToolbar'
import type { ToolId } from '@/components/evaluation/workspace/AnnotationToolbar'
import { ToolSettingsPanel } from '@/components/evaluation/workspace/ToolSettingsPanel'
import { AnnotationDedupe } from '@/components/evaluation/workspace/AnnotationDedupe'
import { AnnotationEmptyGuard } from '@/components/evaluation/workspace/AnnotationEmptyGuard'
import { AnnotationHover } from '@/components/evaluation/workspace/AnnotationHover'
import { AnnotationDeleteKey } from '@/components/evaluation/workspace/AnnotationDeleteKey'
import { DisableTextSelection } from '@/components/evaluation/workspace/DisableTextSelection'
import { UndoRedo } from '@/components/evaluation/workspace/UndoRedo'
import { ZoomControl } from '@/components/evaluation/workspace/ZoomControl'
import { CommentsPanel } from '@/components/evaluation/workspace/CommentsPanel'
import { VerdictConfirmModal } from '@/components/evaluation/workspace/VerdictConfirmModal'
import type { AnnotationSummary } from '@/components/evaluation/workspace/VerdictConfirmModal'
import { useAnnotationDraft } from '@/components/evaluation/workspace/useAnnotationDraft'
import type { AnnotationDraftStatus } from '@/components/evaluation/workspace/useAnnotationDraft'
import { isReviewAnnotation } from '@/components/evaluation/workspace/review-annotations'
import { VersionPanel } from '@/components/evaluation/workspace/VersionPanel'
import type { StudentVersionListItem } from '@/lib/actions/student-review'
import type { SubmissionMeta } from '@/types/milestones'

/** Who is viewing the workspace: the adviser (full editing) or a student (strictly read-only). */
export type WorkspaceMode = 'reviewer' | 'student'

export interface DocumentWorkspaceProps {
  /** Viewer mode — student strips every editing affordance and write path. */
  mode?: WorkspaceMode
  /** Public Vercel Blob URL of the submission's document. */
  blobUrl: string
  /** Submission metadata for the header + Detail slide-over. */
  submission: SubmissionMeta
  /** Saved annotation rows (serialized AnnotationTransferItem[]) for this submission. */
  initialAnnotations: unknown[] | null
  /** Persistence status of the saved annotation row, if any. */
  draftStatus: 'DRAFT' | 'COMMITTED' | null
  /** Version list for the student Version panel (student mode only). */
  versions?: StudentVersionListItem[]
  /** Back-link target (defaults to the adviser evaluations page). */
  backHref?: string
}

/** Which right slide-over panel is open (if any). */
type PanelId = 'comments' | 'versions'

/** Verdict being confirmed, with the annotation payload captured at open time. */
interface VerdictState {
  decision: 'APPROVED' | 'NEED_REVISION'
  summary: AnnotationSummary
  data: unknown | null
}

/** Stable document id for the single document open in this workspace. */
const CURRENT_DOCUMENT_ID = 'submission-current'

/**
 * Maps an annotation subtype to the summary key used by VerdictConfirmModal
 * (the same tool ids as AnnotationToolbar). Only the five workspace tools are
 * counted; anything else is ignored by the summary.
 */
const SUBTYPE_TO_SUMMARY_KEY: Partial<
  Record<PdfAnnotationSubtype, keyof AnnotationSummary>
> = {
  [PdfAnnotationSubtype.HIGHLIGHT]: 'highlight',
  [PdfAnnotationSubtype.TEXT]: 'text',
  [PdfAnnotationSubtype.INK]: 'ink',
  [PdfAnnotationSubtype.FREETEXT]: 'freeText',
  [PdfAnnotationSubtype.STRIKEOUT]: 'strikeout',
}

/**
 * Maps an annotation subtype to the toolbar tool that creates it — used to
 * activate the matching tool when an existing annotation is selected. Native
 * TEXT (sticky note) has no toolbar tool, so it is intentionally absent.
 */
const SUBTYPE_TO_TOOL: Partial<Record<PdfAnnotationSubtype, ToolId>> = {
  [PdfAnnotationSubtype.HIGHLIGHT]: 'highlight',
  [PdfAnnotationSubtype.STRIKEOUT]: 'strikeout',
  [PdfAnnotationSubtype.INK]: 'ink',
  [PdfAnnotationSubtype.FREETEXT]: 'freeText',
}

/** Counts annotations per tool type from serialized AnnotationTransferItem[]. */
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
 * Adviser document review workspace — ONE specific document version per
 * browser tab. Opening a different version navigates to its own workspace
 * URL; there are no internal version tabs.
 *
 * Layout (top → bottom): header bar (back link + group/chapter/status +
 * annotation toolbar + Comments + verdict actions) → full-width PDF viewer.
 * Comments opens as a right slide-over panel on demand.
 *
 * The ENTIRE layout lives inside a single `<EmbedPDF>` root so every child
 * (header toolbar, panels) can use the plugin hooks (`useAnnotation`,
 * `useScroll`, ...). The annotation draft auto-save is wired to the
 * submission's document scope.
 */
export function DocumentWorkspace({
  mode = 'reviewer',
  blobUrl,
  submission,
  initialAnnotations,
  draftStatus,
  versions,
  backHref,
}: DocumentWorkspaceProps) {
  const isStudent = mode === 'student'
  const { engine, isLoading, error } = usePdfiumEngine()
  const { data: session } = useSession()

  // The adviser's display name is stamped on every annotation they create.
  const annotationAuthor = session?.user?.name ?? 'Adviser'

  // Plugin registration order matters — each plugin's dependencies must be
  // registered before it: document-manager → viewport → scroll → render →
  // interaction-manager → selection → history → annotation.
  //
  // In student (read-only) mode EVERY tool is registered with interaction
  // overrides that disable drag/resize/rotate — otherwise a selected ink or
  // sticky-note annotation can still be moved through the plugin's own
  // drag surface even though our custom drag surfaces never mount.
  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: blobUrl, documentId: CURRENT_DOCUMENT_ID }],
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
        // Tool overrides (deep-merged with the plugin defaults by id):
        // - highlight/strikeout: render from the annotation object instead of a
        //   stale appearance stream (useAppearanceStream: false) so color
        //   changes apply immediately and the customAnnotationRenderer can hide
        //   unselected highlights; selectAfterCreate keeps the fresh annotation
        //   selected (visible + color panel targets it); isDraggable enables
        //   the plugin's drag surface once selected.
        // - freeText: never auto-edit on creation (single click selects, double
        //   click edits) and never create a box from a plain click (only an
        //   intentional drag creates one).
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
          // Read-only locks for tools without reviewer overrides above.
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
          <WorkspaceLayout
            mode={mode}
            activeDocumentId={activeDocumentId}
            submission={submission}
            initialAnnotations={initialAnnotations}
            draftStatus={draftStatus}
            versions={versions}
            backHref={backHref}
          />
        )}
      </EmbedPDF>
    </div>
  )
}

/**
 * The full workspace layout, rendered INSIDE the EmbedPDF tree so all plugin
 * hooks work. Kept as a separate module-level component (not an inline
 * function) so it does not remount on every parent render.
 */
function WorkspaceLayout({
  mode = 'reviewer',
  activeDocumentId,
  submission,
  initialAnnotations,
  draftStatus,
  versions,
  backHref,
}: {
  mode?: WorkspaceMode
  activeDocumentId: string | null
  submission: SubmissionMeta
  initialAnnotations: unknown[] | null
  draftStatus: 'DRAFT' | 'COMMITTED' | null
  versions?: StudentVersionListItem[]
  backHref?: string
}) {
  const isStudent = mode === 'student'
  const router = useRouter()
  const viewerRef = useRef<HTMLDivElement>(null)

  // --- Annotation draft auto-save (REVIEWER ONLY) ---------------------------
  // Wired to the submission's document scope. Annotations are persisted per
  // submission row; the server rejects saves for soft-deleted (previous)
  // versions, so only a live PENDING version can ever auto-save. Students
  // never save — the hook is not even mounted in student mode.
  //
  // Freshly created highlight/strikeout annotations are tracked as "pending"
  // (no comment yet) and excluded from auto-save until a comment is submitted.
  const pendingCommentIdsRef = useRef<Set<string>>(new Set())
  const { status: liveDraftStatus } = useAnnotationDraft({
    submissionId: submission.id,
    documentId: CURRENT_DOCUMENT_ID,
    initialAnnotations: (initialAnnotations ?? []) as AnnotationTransferItem[],
    excludeIdsRef: pendingCommentIdsRef,
    enabled: !isStudent,
  })

  // Whether the adviser has added any annotations on this submission —
  // Request Revisions requires at least one annotation.
  const { state: annotationState, provides: annotationApi } = useAnnotation(
    CURRENT_DOCUMENT_ID,
  )
  const hasAnnotations = Object.keys(annotationState.byUid).length > 0

  // Seed the bottom-bar status from the persisted row so an existing draft
  // reads "Draft saved ✓" on load; live status takes over once the user edits.
  const [seededDraftStatus] = useState<AnnotationDraftStatus>(() =>
    draftStatus === 'DRAFT' || draftStatus === 'COMMITTED' ? 'saved' : 'idle',
  )
  const draftSaveStatus: AnnotationDraftStatus =
    liveDraftStatus === 'idle' ? seededDraftStatus : liveDraftStatus

  // --- Annotation export (verdict payload) ---------------------------------
  // The global capability (not useAnnotation) so the layout does not re-render
  // on every annotation state change.
  const { provides: annotationCapability } = useAnnotationCapability()
  const annotationCapabilityRef = useRef(annotationCapability)
  annotationCapabilityRef.current = annotationCapability

  // --- Panels + verdict state ----------------------------------------------
  const [panel, setPanel] = useState<PanelId | null>(null)
  const [verdict, setVerdict] = useState<VerdictState | null>(null)

  // --- Active annotation tool (shared by the toolbar + settings panel) -----
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)

  // --- Auto-open Comments on inline annotation creation ---------------------
  // When the adviser creates a highlight/strikeout with the tool armed (a fresh
  // user action, not a hydration import), open the Comments panel and focus the
  // new annotation's comment editor so they can type the comment immediately.
  //
  // The annotation is tracked as "pending" until a comment is saved. If the
  // user cancels, clicks outside, or closes the panel without saving, the
  // pending annotation is deleted so an empty highlight never lingers.
  const [autoEditId, setAutoEditId] = useState<string | null>(null)
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null)
  const inlineToolArmedRef = useRef(false)

  // Clicking an annotation in the viewer opens the Comments panel (if closed)
  // and highlights the matching comment card.
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

  // Selecting an annotation activates its matching tool: the toolbar
  // highlights it and the settings strip reads the annotation's own
  // color/size (ToolSettingsPanel already prefers the selected object).
  // Deselecting keeps the current tool — only a positive selection switches.
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
      // Only react to annotations on the active tab.
      if (event.documentId !== activeDocumentId) return

      // Task: Ensure new annotations (especially pen/ink) are selectable
      // and show the delete menu immediately.
      // The plugin might not auto-select new annotations.
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

  // A comment was saved — the annotation is no longer pending, so a later
  // cancel must NOT delete it.
  function handleSaveComment(comment: { id: string }) {
    pendingCommentIdsRef.current.delete(comment.id)
  }

  // The editor closed without saving (cancel button / click-outside). If the
  // annotation is still pending (freshly created, no comment), discard it.
  function handleCancelEdit(comment: { id: string; pageIndex: number }) {
    if (!pendingCommentIdsRef.current.has(comment.id)) return
    pendingCommentIdsRef.current.delete(comment.id)
    annotationCapabilityRef.current?.deleteAnnotation(comment.pageIndex, comment.id)
  }

  // Closing the panel without saving discards any pending annotations.
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

  // Verdict flow: capture THIS submission's annotations (the ones that will
  // be committed to the submission row) as the serialized payload + a per-tool
  // summary, then open the confirmation modal.
  async function openVerdict(decision: 'APPROVED' | 'NEED_REVISION') {
    const cap = annotationCapabilityRef.current
    let data: unknown = null
    let summary: AnnotationSummary = {}
    if (cap) {
      await cap.exportAnnotations(undefined, CURRENT_DOCUMENT_ID).wait(
        (items) => {
          // Native document annotations (hyperlinks etc.) share the store —
          // only review-tool annotations may be committed to the submission.
          const reviewItems = items.filter((item) =>
            isReviewAnnotation(item.annotation),
          )
          if (reviewItems.length === 0) return
          const serialized = serializeAnnotations(reviewItems)
          data = serialized
          summary = summarizeAnnotations(serialized)
        },
        (error) => {
          console.error('[DocumentWorkspace] exportAnnotations failed:', error)
        },
      )
    }
    setVerdict({ decision, summary, data })
  }

  // Deselect the selected annotation when the user clicks anywhere in the
  // viewer that is NOT on an annotation. Every annotation is wrapped in an
  // element carrying `data-no-interaction`, so `closest()` reliably detects
  // annotation hits (including the comment editor bar, which lives inside the
  // annotation container). Clicks on page background OR text deselect.
  //
  // The comment focus/highlight (Comments panel card highlight) is tied to the
  // annotation selection — unselecting removes ONLY that focus state; the
  // annotation's own visual (highlight/strike) is independent and stays.
  function handleViewerPointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement
    if (target.closest('[data-no-interaction]')) return
    annotationCapabilityRef.current?.deselectAnnotation()
    setHighlightCommentId(null)
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      {/* Heal duplicate annotation uids in the store (behavior-only) */}
      {activeDocumentId && <AnnotationDedupe documentId={activeDocumentId} />}

      {/* Mutation behaviors — REVIEWER ONLY. Students never get a client-side
          path that creates, edits, or deletes an annotation. */}
      {!isStudent && activeDocumentId && (
        <>
          {/* Delete freeText annotations with empty contents (behavior-only) */}
          <AnnotationEmptyGuard documentId={activeDocumentId} />

          {/* Delete selected annotation on Delete/Backspace (behavior-only) */}
          <AnnotationDeleteKey documentId={activeDocumentId} />
        </>
      )}

      {/* Disable cursor text selection/copying (highlight tools unaffected) */}
      {activeDocumentId && <DisableTextSelection documentId={activeDocumentId} />}

      {/* Header bar: back + context | draft status | tools | zoom | undo/redo | panels + verdict */}
      <header className="flex items-center gap-[14px] px-6 h-[64px] bg-white border-b border-[#eceef8] shrink-0">
        <Link
          href={backHref ?? '/faculty/evaluation'}
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

        {/* Draft save status (right of the stats) — REVIEWER ONLY */}
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

        {/* Annotation toolbar — REVIEWER ONLY (students get zero editing tools) */}
        {!isStudent && activeDocumentId && (
          <AnnotationToolbar
            documentId={activeDocumentId}
            activeTool={activeTool}
            onActiveToolChange={handleActiveToolChange}
          />
        )}

        {!isStudent && <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />}

        {/* Zoom controls — 20% to 200%, per active document (viewing tool) */}
        {activeDocumentId && <ZoomControl documentId={activeDocumentId} />}

        {/* Undo / Redo — REVIEWER ONLY */}
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

          {/* Versions — STUDENT ONLY (the adviser navigates versions via the
              teams drawer; each student version opens in its own tab) */}
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

          {!isStudent && (
            <>
              <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />

              {/* Verdict actions — REVIEWER ONLY */}
              <button
                type="button"
                onClick={() => openVerdict('NEED_REVISION')}
                disabled={!hasAnnotations}
                title={
                  hasAnnotations
                    ? 'Request revisions to this submission'
                    : 'Add annotations before requesting revisions'
                }
                className="flex items-center justify-center gap-[6px] h-[32px] px-[12px] rounded-[8px] bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] font-sans font-bold text-[11.5px] leading-[17px] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.14)] transition-colors focus-visible:ring-2 focus-visible:ring-[rgba(245,158,11,0.4)] outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[rgba(245,158,11,0.08)]"
              >
                <RotateCcw className="size-[13px]" />
                Request Revisions
              </button>
              <button
                type="button"
                onClick={() => openVerdict('APPROVED')}
                title="Approve this submission"
                className="flex items-center justify-center gap-[6px] h-[32px] px-[14px] rounded-[8px] bg-[#16a34a] font-sans font-bold text-[11.5px] leading-[17px] text-white hover:bg-[#15803d] transition-colors focus-visible:ring-2 focus-visible:ring-[rgba(22,163,74,0.4)] outline-none"
              >
                <Check className="size-[13px]" strokeWidth={2.5} />
                Approve
              </button>
            </>
          )}
        </div>
      </header>

      {/* Per-tool settings strip (color / size) — REVIEWER ONLY, while a tool is active */}
      {!isStudent && activeDocumentId && (
        <ToolSettingsPanel documentId={activeDocumentId} activeTool={activeTool} />
      )}

      {/* Viewer + right-side panel (inline — the PDF shrinks to make room) */}
      <div className="flex-1 min-h-0 flex">
        <div
          ref={viewerRef}
          className="flex-1 min-h-0 relative bg-[#e8eaf4] epdf-viewer-area"
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

          {/* Hover border + click selection on annotations (JS hit-testing) —
              the delete menu is reviewer-only */}
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
          <CommentsPanel
            documentId={activeDocumentId}
            readOnly={isStudent}
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

      {/* Verdict confirmation modal */}
      {verdict && (
        <VerdictConfirmModal
          submissionId={submission.id}
          decision={verdict.decision}
          annotationSummary={verdict.summary}
          annotationData={verdict.data}
          onClose={() => setVerdict(null)}
          // The evaluation is finalized on success — return to the Teams tab
          // (the default tab of /faculty/evaluation). refresh() first: it
          // invalidates the client Router Cache so the list reflects the
          // verdict immediately instead of serving the pre-verdict snapshot.
          onCommitted={() => {
            router.refresh()
            router.push('/faculty/evaluation')
          }}
        />
      )}
    </div>
  )
}

/** Centered loading / error / empty state for the viewer area. */
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
