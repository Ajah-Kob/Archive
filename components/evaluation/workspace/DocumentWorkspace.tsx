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
import {
  DocumentContent,
  DocumentManagerPluginPackage,
  useDocumentManagerCapability,
  useOpenDocuments,
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
import type { EvaluationVersion } from '@/lib/actions/evaluation'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import { WorkspaceTabBar } from '@/components/evaluation/workspace/WorkspaceTabBar'
import type { WorkspaceTab } from '@/components/evaluation/workspace/WorkspaceTabBar'
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
import { VersionDrawer } from '@/components/evaluation/workspace/VersionDrawer'
import { VerdictConfirmModal } from '@/components/evaluation/workspace/VerdictConfirmModal'
import type { AnnotationSummary } from '@/components/evaluation/workspace/VerdictConfirmModal'
import { useAnnotationDraft } from '@/components/evaluation/workspace/useAnnotationDraft'
import type { AnnotationDraftStatus } from '@/components/evaluation/workspace/useAnnotationDraft'
import type { SubmissionMeta } from '@/types/milestones'

export interface DocumentWorkspaceProps {
  /** Public Vercel Blob URL of the current submission's document. */
  blobUrl: string
  /** Submission metadata for the header + Detail slide-over. */
  submission: SubmissionMeta
  /** All versions of the chapter (current + previous) for the tab bar / Versions drawer. */
  versions: EvaluationVersion[]
  /** Saved annotation rows (serialized AnnotationTransferItem[]) for the current submission. */
  initialAnnotations: unknown[] | null
  /** Persistence status of the saved annotation row, if any. */
  draftStatus: 'DRAFT' | 'COMMITTED' | null
}

/** Which right slide-over panel is open (if any). */
type PanelId = 'comments' | 'versions'

/** Verdict being confirmed, with the annotation payload captured at open time. */
interface VerdictState {
  decision: 'APPROVED' | 'NEED_REVISION'
  summary: AnnotationSummary
  data: unknown | null
}

/** Stable document id for a version — matches the id passed to openDocumentUrl. */
const versionDocumentId = (versionId: number) => `version-${versionId}`

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
 * Adviser document review workspace — the orchestrator that ties the whole
 * headless EmbedPDF review surface together (design spec 2026-08-18, Section 4).
 *
 * Layout (top → bottom): browser-style version tab bar → header bar (back link
 * + group/chapter/status + annotation toolbar + Detail/Comments/Versions) →
 * full-width PDF viewer → sticky bottom action bar. Detail/Comments/Versions
 * open as right slide-over panels on demand.
 *
 * The ENTIRE layout lives inside a single `<EmbedPDF>` root so every child
 * (tab bar, header toolbar, panels) can use the plugin hooks
 * (`useAnnotation`, `useScroll`, `useDocumentManagerCapability`,
 * `useOpenDocuments`). The viewer is built inline here rather than reusing
 * `PdfViewer` (which owns its own EmbedPDF root) — nesting two providers would
 * create two independent plugin registries and break the shared context.
 *
 * Tab management is backed by the DocumentManagerPluginPackage multi-document
 * state: the current version is the default tab, opening a version from the
 * Versions drawer calls `openDocumentUrl` (adds a tab), switching tabs calls
 * `setActiveDocument`, and closing tabs calls `closeDocument` (the last tab is
 * guarded). The annotation draft auto-save is wired to the CURRENT version's
 * document (the submission being reviewed) — see WorkspaceLayout notes.
 */
export function DocumentWorkspace({
  blobUrl,
  submission,
  versions,
  initialAnnotations,
  draftStatus,
}: DocumentWorkspaceProps) {
  const { engine, isLoading, error } = usePdfiumEngine()
  const { data: session } = useSession()

  // The adviser's display name is stamped on every annotation they create.
  const annotationAuthor = session?.user?.name ?? 'Adviser'

  // The current version is the default tab. Its document id is stable for the
  // whole session so the annotation draft hook can key on it.
  const currentVersion =
    versions.find((v) => v.isCurrent) ?? versions[0] ?? null
  const currentDocumentId = currentVersion
    ? versionDocumentId(currentVersion.id)
    : 'version-current'
  const currentLabel = currentVersion ? `v${currentVersion.version}` : 'Current'

  // Plugin registration order matters — each plugin's dependencies must be
  // registered before it: document-manager → viewport → scroll → render →
  // interaction-manager → selection → history → annotation. Mirrors PdfViewer
  // but at the workspace level with multi-document support.
  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [
          { url: blobUrl, documentId: currentDocumentId, name: currentLabel },
        ],
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
            interaction: { exclusive: false, isDraggable: true },
          },
          {
            id: 'strikeout',
            behavior: { useAppearanceStream: false, selectAfterCreate: true },
            interaction: { exclusive: false, isDraggable: true },
          },
          {
            id: 'freeText',
            behavior: { editAfterCreate: false, selectAfterCreate: true },
            clickBehavior: { enabled: false } as FreeTextClickBehavior,
          },
        ],
      }),
    ],
    [blobUrl, currentDocumentId, currentLabel, annotationAuthor],
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
            activeDocumentId={activeDocumentId}
            submission={submission}
            versions={versions}
            initialAnnotations={initialAnnotations}
            draftStatus={draftStatus}
            currentDocumentId={currentDocumentId}
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
  activeDocumentId,
  submission,
  versions,
  initialAnnotations,
  draftStatus,
  currentDocumentId,
}: {
  activeDocumentId: string | null
  submission: SubmissionMeta
  versions: EvaluationVersion[]
  initialAnnotations: unknown[] | null
  draftStatus: 'DRAFT' | 'COMMITTED' | null
  currentDocumentId: string
}) {
  const router = useRouter()
  const viewerRef = useRef<HTMLDivElement>(null)

  // --- Document manager (tabs) ---------------------------------------------
  const { provides: dm } = useDocumentManagerCapability()
  const dmRef = useRef(dm)
  dmRef.current = dm

  const openDocuments = useOpenDocuments()
  const tabs: WorkspaceTab[] = useMemo(
    () =>
      openDocuments.map((doc) => ({
        id: doc.id,
        label: doc.name ?? 'Document',
        isCurrent: doc.id === currentDocumentId,
      })),
    [openDocuments, currentDocumentId],
  )

  // --- Annotation draft auto-save ------------------------------------------
  // Wired to the CURRENT version's document (the submission being reviewed),
  // not the active tab. Annotations are persisted per submission row, and the
  // server rejects saves for soft-deleted (previous) versions, so only the
  // current document's scope may auto-save. The scope stays alive for the
  // whole session (the last tab is guarded), so the hook hydrates the saved
  // annotations exactly once — re-hydrating on tab switches would duplicate
  // them (the annotation reducer is not idempotent).
  //
  // Freshly created highlight/strikeout annotations are tracked as "pending"
  // (no comment yet) and excluded from auto-save until a comment is submitted.
  const pendingCommentIdsRef = useRef<Set<string>>(new Set())
  const { status: liveDraftStatus } = useAnnotationDraft({
    submissionId: submission.id,
    documentId: currentDocumentId,
    initialAnnotations: (initialAnnotations ?? []) as AnnotationTransferItem[],
    excludeIdsRef: pendingCommentIdsRef,
  })

  // Whether the adviser has added any annotations on the current submission —
  // Request Revisions requires at least one annotation.
  const { state: annotationState } = useAnnotation(currentDocumentId)
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

  function handleActiveToolChange(tool: ToolId | null) {
    setActiveTool(tool)
    if (tool === 'highlight' || tool === 'strikeout') {
      inlineToolArmedRef.current = true
    }
  }

  useEffect(() => {
    if (!annotationCapability) return
    const unsubscribe = annotationCapability.onAnnotationEvent((event) => {
      if (event.type !== 'create' || !event.committed) return
      // Only react to annotations on the active tab.
      if (event.documentId !== activeDocumentId) return
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

  function selectTab(id: string) {
    dmRef.current?.setActiveDocument(id)
  }

  function closeTab(id: string) {
    // Guard the last open tab — the workspace always keeps at least one.
    if (tabs.length <= 1) return
    dmRef.current?.closeDocument(id).wait(
      () => {},
      (error) => {
        console.error('[DocumentWorkspace] closeDocument failed:', error)
      },
    )
  }

  function openVersion(version: EvaluationVersion) {
    const id = versionDocumentId(version.id)
    const cap = dmRef.current
    if (!cap) return
    // Already open — just switch to it.
    if (cap.isDocumentOpen(id)) {
      cap.setActiveDocument(id)
      setPanel(null)
      return
    }
    cap
      .openDocumentUrl({
        url: version.blobUrl,
        documentId: id,
        name: `v${version.version}`,
        autoActivate: true,
      })
      .wait(
        () => setPanel(null),
        (error) => {
          console.error('[DocumentWorkspace] openDocumentUrl failed:', error)
        },
      )
  }

  // Verdict flow: capture the CURRENT submission's annotations (the ones that
  // will be committed to the submission row) as the serialized payload + a
  // per-tool summary, then open the confirmation modal. Exporting the active
  // tab instead would attach a previous version's annotations to the current
  // submission — a data integrity bug.
  async function openVerdict(decision: 'APPROVED' | 'NEED_REVISION') {
    const cap = annotationCapabilityRef.current
    let data: unknown = null
    let summary: AnnotationSummary = {}
    if (cap) {
      await cap.exportAnnotations(undefined, currentDocumentId).wait(
        (items) => {
          if (items.length === 0) return
          const serialized = serializeAnnotations(items)
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

      {/* Delete freeText annotations with empty contents (behavior-only) */}
      {activeDocumentId && <AnnotationEmptyGuard documentId={activeDocumentId} />}

      {/* Delete selected annotation on Delete/Backspace (behavior-only) */}
      {activeDocumentId && <AnnotationDeleteKey documentId={activeDocumentId} />}

      {/* Disable cursor text selection/copying (highlight tools unaffected) */}
      {activeDocumentId && <DisableTextSelection documentId={activeDocumentId} />}

      {/* Browser-style version tab bar (top) */}
      <WorkspaceTabBar
        tabs={tabs}
        activeTabId={activeDocumentId}
        onSelectTab={selectTab}
        onCloseTab={closeTab}
        onOpenVersions={() => setPanel('versions')}
      />

      {/* Header bar: back + context | draft status | tools | zoom | undo/redo | panels + verdict */}
      <header className="flex items-center gap-[14px] px-6 h-[64px] bg-white border-b border-[#eceef8] shrink-0">
        <Link
          href="/faculty/evaluation"
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

        {/* Draft save status (right of the stats) */}
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
              {draftSaveStatus === 'saved' ? 'Draft saved' : 'Saved just now'}
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Annotation toolbar — operates on the ACTIVE document */}
        {activeDocumentId && (
          <AnnotationToolbar
            documentId={activeDocumentId}
            activeTool={activeTool}
            onActiveToolChange={handleActiveToolChange}
          />
        )}

        <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />

        {/* Zoom controls — 20% to 200%, per active document */}
        {activeDocumentId && <ZoomControl documentId={activeDocumentId} />}

        {/* Undo / Redo */}
        <UndoRedo />

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

          <div className="w-px h-[22px] bg-[#eceef8]" aria-hidden="true" />

          {/* Verdict actions */}
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
        </div>
      </header>

      {/* Per-tool settings strip (color / size) — shown while a tool is active */}
      {activeDocumentId && (
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

          {/* Hover border + click selection menu on annotations (JS hit-testing) */}
          {activeDocumentId && (
            <AnnotationHover
              documentId={activeDocumentId}
              viewerRef={viewerRef}
              onSelectAnnotation={handleSelectAnnotation}
            />
          )}
        </div>

        {panel === 'comments' && activeDocumentId && (
          <CommentsPanel
            documentId={activeDocumentId}
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
        {panel === 'versions' && (
          <VersionDrawer
            submissionId={submission.id}
            onClose={() => setPanel(null)}
            onOpenVersion={openVersion}
          />
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
          onCommitted={() => router.refresh()}
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
