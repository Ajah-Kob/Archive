'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Circle,
  Eraser,
  Hexagon,
  Highlighter,
  LineSquiggle,
  MessageSquare,
  MessageSquareText,
  Minus,
  MousePointer2,
  Pencil,
  Pen,
  Save,
  Spline,
  Square,
  Stamp,
  StickyNote,
  Strikethrough,
  Trash2,
  Type,
  Underline,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import { useScroll } from '@embedpdf/plugin-scroll/react'
import {
  PdfAnnotationSubtype,
  PdfAnnotationSubtypeName,
} from '@embedpdf/models'
import type { PdfAnnotationObject } from '@embedpdf/models'
import { WorkspacePanel } from '@/components/evaluation/workspace/WorkspacePanel'
import { isReviewAnnotation } from '@/components/evaluation/workspace/review-annotations'

interface CommentsPanelProps {
  /** Active document id from the headless DocumentManagerPluginPackage. */
  documentId: string
  /**
   * Read-only mode (student workspace): cards render contents only — no
   * comment editor, no edit/delete actions. Jump-to-annotation still works.
   */
  readOnly?: boolean
  /** Annotation id whose comment editor should open focused (e.g. just created). */
  autoEditId?: string | null
  /** Annotation id whose comment card should be highlighted + scrolled into view. */
  highlightId?: string | null
  onClose: () => void
  /** Fired when a comment editor closes without saving (cancel / click-outside). */
  onCancelEdit: (comment: CommentItem) => void
  /** Fired after a comment is saved. */
  onSaveComment: (comment: CommentItem) => void
}

/** A flattened, render-ready annotation entry for the comment list. */
interface CommentItem {
  id: string
  pageIndex: number
  type: PdfAnnotationObject['type']
  author: string
  contents: string
  /** Whether this annotation type accepts a comment (highlight/strikeout). */
  canComment: boolean
  /** Creation timestamp (ms) — normalized from the annotation's created field. */
  created: number
}

/** Annotation category shown on each comment card. */
type AnnotationCategory = 'Inline' | 'Drawing' | 'Text'

/** Inline (text-markup) annotation types that accept a comment in this panel. */
const COMMENTABLE_TYPES = new Set<PdfAnnotationSubtype>([
  PdfAnnotationSubtype.HIGHLIGHT,
  PdfAnnotationSubtype.STRIKEOUT,
])

/** Category label + icon per annotation subtype. */
const TYPE_META: Partial<
  Record<PdfAnnotationSubtype, { label: AnnotationCategory; icon: LucideIcon }>
> = {
  // Inline (text markup)
  [PdfAnnotationSubtype.HIGHLIGHT]: { label: 'Inline', icon: Highlighter },
  [PdfAnnotationSubtype.UNDERLINE]: { label: 'Inline', icon: Underline },
  [PdfAnnotationSubtype.SQUIGGLY]: { label: 'Inline', icon: LineSquiggle },
  [PdfAnnotationSubtype.STRIKEOUT]: { label: 'Inline', icon: Strikethrough },
  // Drawing
  [PdfAnnotationSubtype.INK]: { label: 'Drawing', icon: Pen },
  [PdfAnnotationSubtype.LINE]: { label: 'Drawing', icon: Minus },
  [PdfAnnotationSubtype.SQUARE]: { label: 'Drawing', icon: Square },
  [PdfAnnotationSubtype.CIRCLE]: { label: 'Drawing', icon: Circle },
  [PdfAnnotationSubtype.POLYGON]: { label: 'Drawing', icon: Hexagon },
  [PdfAnnotationSubtype.POLYLINE]: { label: 'Drawing', icon: Spline },
  // Text
  [PdfAnnotationSubtype.FREETEXT]: { label: 'Text', icon: Type },
  [PdfAnnotationSubtype.TEXT]: { label: 'Text', icon: StickyNote },
  [PdfAnnotationSubtype.STAMP]: { label: 'Text', icon: Stamp },
  [PdfAnnotationSubtype.CARET]: { label: 'Text', icon: MousePointer2 },
  [PdfAnnotationSubtype.REDACT]: { label: 'Text', icon: Eraser },
}

function getTypeMeta(type: PdfAnnotationObject['type']) {
  const known = TYPE_META[type]
  if (known) return known
  const raw = PdfAnnotationSubtypeName[type] ?? 'annotation'
  return {
    label: raw.charAt(0).toUpperCase() + raw.slice(1),
    icon: MessageSquare,
  }
}

function CommentCard({
  comment,
  readOnly = false,
  autoEdit = false,
  highlighted = false,
  onJump,
  onDelete,
  onSave,
  onCancelEdit,
}: {
  comment: CommentItem
  /** Read-only (student workspace): no editor, no edit/delete actions. */
  readOnly?: boolean
  /** Open the comment editor focused on mount (used for a just-created annotation). */
  autoEdit?: boolean
  /** Visually highlight the card + scroll it into view (e.g. annotation clicked). */
  highlighted?: boolean
  onJump: (comment: CommentItem) => void
  onDelete: (comment: CommentItem) => void
  onSave: (comment: CommentItem, text: string) => void
  /** Fired when the editor closes without saving (cancel / click-outside). */
  onCancelEdit: (comment: CommentItem) => void
}) {
  const { label, icon: TypeIcon } = getTypeMeta(comment.type)
  const [draft, setDraft] = useState(comment.contents)
  const [editing, setEditing] = useState(autoEdit)
  const prevIdRef = useRef(comment.id)
  const containerRef = useRef<HTMLDivElement>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll the highlighted card into view so the user sees the comment that
  // matches the annotation they clicked.
  useEffect(() => {
    if (highlighted) {
      containerRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [highlighted])

  // Open the editor when `autoEdit` becomes true. This covers the case where
  // the Comments panel is already open: the new annotation's card can mount
  // before `autoEditId` is set (so `useState(autoEdit)` initializes false), and
  // this effect opens the editor once the id arrives.
  useEffect(() => {
    if (autoEdit) setEditing(true)
  }, [autoEdit])

  // Sync the draft + close the editor when the card changes (annotation id).
  // Skipped on mount so `autoEdit` can open the editor for a fresh annotation.
  useEffect(() => {
    if (prevIdRef.current === comment.id) return
    prevIdRef.current = comment.id
    setDraft(comment.contents)
    setEditing(false)
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
  }, [comment.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear any pending single-click jump timer on unmount.
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
    }
  }, [])

  // Click-outside cancels edit mode and discards unsaved changes, restoring
  // the original comment. Clicks inside the card (textarea, Save, Cancel, page
  // pill) are contained and never trigger this.
  //
  // Clicks inside `[data-preserve-editor]` (the tool settings strip — color /
  // size swatches) are NOT abandonment: changing an annotation's color must
  // keep the editor and the pending annotation intact, so the click is ignored
  // here (the color applies via the annotation's own patch instead).
  useEffect(() => {
    if (!editing) return
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current?.contains(e.target as Node)) return
      if ((e.target as HTMLElement).closest('[data-preserve-editor]')) return
      setDraft(comment.contents)
      setEditing(false)
      onCancelEdit(comment)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [editing, comment.contents, onCancelEdit])

  function handleSave() {
    onSave(comment, draft.trim())
    setEditing(false)
  }

  // Single click jumps to the page; a second click within the window (double
  // click) edits the comment instead. The jump is deferred ~250ms so the
  // double-click can cancel it. While editing, the container click is inert so
  // the textarea keeps focus. Read-only cards jump immediately — there is no
  // edit gesture.
  function handleContainerClick() {
    if (editing) return
    if (readOnly) {
      onJump(comment)
      return
    }
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      if (comment.canComment) setEditing(true)
      return
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null
      onJump(comment)
    }, 250)
  }

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`w-full border rounded-[9px] cursor-pointer transition-all focus-within:ring-2 focus-within:ring-[#707dff] outline-none ${
        highlighted
          ? 'border-[#707dff] ring-2 ring-[rgba(112,125,255,0.35)] bg-[#f4f6ff]'
          : editing
            ? 'border-[rgba(112,125,255,0.5)] bg-[#f4f6ff]'
            : 'border-[#eceef8] hover:border-[rgba(112,125,255,0.5)] hover:bg-[#f4f6ff] hover:shadow-[0_2px_8px_rgba(112,125,255,0.12)]'
      }`}
    >
      {/* Read-only cards have no action footer — pad the body bottom so the
          comment text doesn't sit flush against the card border. */}
      <div className={`px-[14px] pt-[12px] ${readOnly ? 'pb-[12px]' : ''}`}>
        <div className="flex items-center gap-[8px] min-w-px">
          <span className="flex items-center justify-center size-[26px] rounded-[8px] bg-[#f4f6ff] border border-[#e5e8ff] shrink-0">
            <TypeIcon className="size-[13px] text-[#707dff]" strokeWidth={2} />
          </span>
          <p className="shrink-0 font-sans font-bold text-[12.5px] leading-[18.75px] text-[#3d4566]">
            {label}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onJump(comment)
            }}
            title={`Jump to page ${comment.pageIndex + 1}`}
            className="shrink-0 bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff] hover:bg-[#e8ecff] hover:border-[rgba(112,125,255,0.4)] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none"
          >
            Page {comment.pageIndex + 1}
          </button>
          <div className="flex-1" />
          <p className="truncate font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
            {comment.author}
          </p>
        </div>
        {editing && comment.canComment && !readOnly ? (
          <div className="pt-[8px]" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSave()
                }
              }}
              rows={3}
              maxLength={500}
              autoFocus
              placeholder="Add a comment…"
              aria-label="Comment on this annotation"
              className="w-full h-[64px] px-[9px] py-[7px] bg-[#fafbff] border border-[#e8ebf8] rounded-[7px] font-sans font-medium text-[11.5px] leading-[17px] text-[#3d4566] placeholder:text-[#9ea8c6] outline-none focus:border-[rgba(112,125,255,0.5)] transition-colors resize-none"
            />
          </div>
        ) : (
          <p className="pt-[8px] font-sans font-medium text-[12px] leading-[18px] text-[#5a6382]">
            {comment.contents ||
              (comment.canComment
                ? 'No comment yet — click to add one.'
                : 'No text — click to view it on the page.')}
          </p>
        )}
      </div>

      {/* Action footer — reviewers only. Read-only cards render no actions. */}
      {!readOnly ? (
        comment.canComment ? (
          <div className="px-[10px] pt-[6px] pb-[8px]">
            {editing ? (
              <div
                className="flex items-center justify-end gap-[6px]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    onCancelEdit(comment)
                  }}
                  title="Cancel"
                  className="flex items-center gap-[5px] h-[26px] px-[8px] rounded-[7px] font-sans font-semibold text-[11px] leading-[16px] text-[#5a6382] transition-all hover:bg-gray-50 hover:text-[#3d4566] focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!draft.trim()}
                  title="Save comment (Enter)"
                  className="flex items-center gap-[5px] h-[26px] px-[10px] rounded-[7px] bg-[#707dff] font-sans font-bold text-[11px] leading-[16px] text-white hover:bg-[#5565ff] transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="size-[12px]" strokeWidth={2} />
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-[6px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(true)
                  }}
                  title={comment.contents ? 'Edit comment' : 'Add a comment'}
                  className="flex items-center gap-[5px] h-[26px] px-[8px] rounded-[7px] font-sans font-semibold text-[11px] leading-[16px] text-[#5a6382] transition-all hover:bg-gray-50 hover:text-[#3d4566] focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none"
                >
                  <Pencil className="size-[12px]" strokeWidth={2} />
                  {comment.contents ? 'Edit' : 'Add comment'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(comment)
                  }}
                  title="Delete annotation"
                  aria-label={`Delete ${label} annotation`}
                  className="flex items-center gap-[5px] h-[26px] px-[8px] rounded-[7px] font-sans font-semibold text-[11px] leading-[16px] text-[#e11d48] transition-all hover:bg-[rgba(225,29,72,0.08)] hover:text-[#c81e45] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none"
                >
                  <Trash2 className="size-[12px]" strokeWidth={2} />
                  Delete
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-end px-[10px] pb-[8px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(comment)
              }}
              title="Delete annotation"
              aria-label={`Delete ${label} annotation`}
              className="flex items-center gap-[5px] h-[24px] px-[8px] rounded-[7px] font-sans font-semibold text-[11px] leading-[16px] text-[#e11d48] transition-all hover:bg-[rgba(225,29,72,0.08)] hover:text-[#c81e45] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none"
            >
              <Trash2 className="size-[12px]" strokeWidth={2} />
              Delete
            </button>
          </div>
        )
      ) : null}
    </div>
  )
}

/**
 * Right-side panel listing the annotations on the active document and the
 * place where comments are added/edited.
 *
 * Every annotation on the document appears here. Highlight/strikeout
 * annotations (the inline tools) get an inline comment editor on their card —
 * this is the only place comments are added now (there is no comment UI on the
 * document). Saved comments render in the card body.
 *
 * The list is derived from the reactive `useAnnotation(documentId).state`
 * (`pages` + `byUid`) so it stays in sync as annotations are created,
 * updated, or deleted — deleted annotations are removed from `pages` by the
 * plugin reducer, so they never appear here. `exportAnnotations()` was
 * considered as the source, but it is a one-shot async Task snapshot meant
 * for persistence; the reactive state is the correct source for a live list.
 *
 * Clicking a comment scrolls the viewer to the annotation's page via the
 * scroll plugin's `scrollToPage` (1-based `pageNumber` — the plugin indexes
 * `pages[pageNumber - 1]`) and selects the annotation so it is highlighted.
 */
export function CommentsPanel({
  documentId,
  readOnly = false,
  autoEditId = null,
  highlightId = null,
  onClose,
  onCancelEdit,
  onSaveComment,
}: CommentsPanelProps) {
  const { state, provides } = useAnnotation(documentId)
  const scroll = useScroll(documentId)

  const comments = useMemo<CommentItem[]>(() => {
    const items: CommentItem[] = []
    for (const [pageKey, uids] of Object.entries(state.pages)) {
      const pageIndex = Number(pageKey)
      for (const uid of uids) {
        const tracked = state.byUid[uid]
        if (!tracked) continue
        const obj = tracked.object
        // Native document annotations (hyperlinks are /Link annotations) are
        // not reviewer feedback — they never appear as comment cards.
        if (!isReviewAnnotation(obj)) continue
        // `created` is not guaranteed to be a Date (string/number/undefined) —
        // normalize to a numeric timestamp for stable sorting.
        const created =
          obj.created instanceof Date
            ? obj.created.getTime()
            : typeof obj.created === 'number'
              ? obj.created
              : typeof obj.created === 'string'
                ? new Date(obj.created).getTime() || 0
                : 0
        items.push({
          id: obj.id,
          pageIndex,
          type: obj.type,
          author: obj.author?.trim() || 'Unknown',
          contents: obj.contents?.trim() || '',
          canComment: COMMENTABLE_TYPES.has(obj.type),
          created,
        })
      }
    }
    return items.sort(
      (a, b) =>
        a.pageIndex - b.pageIndex ||
        a.created - b.created ||
        a.id.localeCompare(b.id),
    )
  }, [state])

  // Close on Escape — standard panel behavior.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleJump(comment: CommentItem) {
    // scrollToPage expects a 1-based pageNumber (plugin reads pages[pageNumber - 1]).
    // alignY: 25 keeps the page in the top quarter, clear of the workspace header.
    scroll.provides?.scrollToPage({
      pageNumber: comment.pageIndex + 1,
      behavior: 'smooth',
      alignY: 25,
    })
    // Highlight the annotation in the viewer.
    provides?.selectAnnotation(comment.pageIndex, comment.id)
  }

  function handleDelete(comment: CommentItem) {
    provides?.deleteAnnotation(comment.pageIndex, comment.id)
  }

  function handleSave(comment: CommentItem, text: string) {
    if (!text) return
    provides?.updateAnnotation(comment.pageIndex, comment.id, {
      contents: text,
    })
    onSaveComment(comment)
  }

  return (
    <WorkspacePanel
      title="Comments"
      subtitle={
        readOnly
          ? 'Reviewer annotations on this document. Click one to jump to its page.'
          : 'Annotations on this document. Click one to jump to its page.'
      }
      count={comments.length}
      onClose={onClose}
    >
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-[8px] py-[24px]">
          <div className="size-[40px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
            <MessageSquareText
              className="size-[18px] text-[#c4cadf]"
              strokeWidth={1.75}
            />
          </div>
          <p className="pt-[8px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">
            No comments yet
          </p>
          <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px]">
            Annotations you add to the document will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              readOnly={readOnly}
              autoEdit={!readOnly && comment.id === autoEditId}
              highlighted={comment.id === highlightId}
              onJump={handleJump}
              onDelete={handleDelete}
              onSave={handleSave}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </div>
      )}
    </WorkspacePanel>
  )
}
