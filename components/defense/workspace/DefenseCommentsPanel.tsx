'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Circle,
  Eraser,
  Eye,
  EyeOff,
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
import { WorkspacePanel } from '@/components/defense/workspace/WorkspacePanel'
import { isReviewAnnotation } from '@/components/defense/workspace/review-annotations'
import {
  buildVisibilityMap,
  resolveVisibility,
} from '@/components/defense/workspace/annotation-visibility'
import { toggleDefenseAnnotationVisibility } from '@/lib/actions/defense-annotation-visibility'
import { toast } from 'sonner'

interface DefenseCommentsPanelProps {
  /** Active document id from the headless DocumentManagerPluginPackage. */
  documentId: string
  /**
   * Read-only mode (student workspace): cards render contents only — no
   * comment editor, no edit/delete actions. Jump-to-annotation still works.
   */
  readOnly?: boolean
  /** When true (student workspace), each card shows Eye/EyeOff visibility toggle. */
  isStudent?: boolean
  /** Defense submission id — required when isStudent is true to persist toggle. */
  submissionId?: number
  /** Serialized AnnotationTransferItem[] used to seed persisted visibility (student). */
  initialAnnotations?: unknown[] | null
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
export interface CommentItem {
  id: string
  pageIndex: number
  type: PdfAnnotationObject['type']
  author: string
  contents: string
  /** Whether this annotation type accepts a comment (highlight/strikeout). */
  canComment: boolean
  /** Creation timestamp (ms) — normalized from the annotation's created field. */
  created: number
  /** Whether annotation is visible to panelist (student toggle). Default true. */
  isVisible: boolean
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
  [PdfAnnotationSubtype.HIGHLIGHT]: { label: 'Inline', icon: Highlighter },
  [PdfAnnotationSubtype.UNDERLINE]: { label: 'Inline', icon: Underline },
  [PdfAnnotationSubtype.SQUIGGLY]: { label: 'Inline', icon: LineSquiggle },
  [PdfAnnotationSubtype.STRIKEOUT]: { label: 'Inline', icon: Strikethrough },
  [PdfAnnotationSubtype.INK]: { label: 'Drawing', icon: Pen },
  [PdfAnnotationSubtype.LINE]: { label: 'Drawing', icon: Minus },
  [PdfAnnotationSubtype.SQUARE]: { label: 'Drawing', icon: Square },
  [PdfAnnotationSubtype.CIRCLE]: { label: 'Drawing', icon: Circle },
  [PdfAnnotationSubtype.POLYGON]: { label: 'Drawing', icon: Hexagon },
  [PdfAnnotationSubtype.POLYLINE]: { label: 'Drawing', icon: Spline },
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

function DefenseCommentCard({
  comment,
  readOnly = false,
  isStudent = false,
  isVisible = true,
  isToggling = false,
  autoEdit = false,
  highlighted = false,
  onJump,
  onDelete,
  onSave,
  onCancelEdit,
  onToggleVisibility,
}: {
  comment: CommentItem
  readOnly?: boolean
  isStudent?: boolean
  isVisible?: boolean
  isToggling?: boolean
  autoEdit?: boolean
  highlighted?: boolean
  onJump: (comment: CommentItem) => void
  onDelete: (comment: CommentItem) => void
  onSave: (comment: CommentItem, text: string) => void
  onCancelEdit: (comment: CommentItem) => void
  onToggleVisibility: (comment: CommentItem, nextVisible: boolean) => void
}) {
  const { label, icon: TypeIcon } = getTypeMeta(comment.type)
  const [draft, setDraft] = useState(comment.contents)
  const [editing, setEditing] = useState(autoEdit)
  const prevIdRef = useRef(comment.id)
  const containerRef = useRef<HTMLDivElement>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showVisibilityToggle = isStudent
  const isHidden = showVisibilityToggle && !isVisible

  useEffect(() => {
    if (highlighted) {
      containerRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [highlighted])

  useEffect(() => {
    if (autoEdit) setEditing(true)
  }, [autoEdit])

  useEffect(() => {
    if (prevIdRef.current === comment.id) return
    prevIdRef.current = comment.id
    setDraft(comment.contents)
    setEditing(false)
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
  }, [comment.id])

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
    }
  }, [])

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
            : isHidden
              ? 'border-[#fecaca] bg-[#fff5f5] hover:border-[#fca5a5] hover:bg-[#fff0f0]'
              : 'border-[#eceef8] hover:border-[rgba(112,125,255,0.5)] hover:bg-[#f4f6ff] hover:shadow-[0_2px_8px_rgba(112,125,255,0.12)]'
      }`}
    >
      <div className={`px-[14px] pt-[12px] ${readOnly && !showVisibilityToggle ? 'pb-[12px]' : 'pb-[6px]'}`}>
        <div className="flex items-center gap-[8px] min-w-px">
          <span className={`flex items-center justify-center size-[26px] rounded-[8px] border shrink-0 ${isHidden ? 'bg-[#fef2f2] border-[#fecaca]' : 'bg-[#f4f6ff] border-[#e5e8ff]'}`}>
            <TypeIcon className={`size-[13px] ${isHidden ? 'text-[#e11d48]' : 'text-[#707dff]'}`} strokeWidth={2} />
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
          <p className="truncate font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6] max-w-[90px]">
            {comment.author}
          </p>
          {showVisibilityToggle ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleVisibility(comment, !isVisible)
              }}
              disabled={isToggling}
              title={isVisible ? 'Hide from panelist' : 'Show to panelist'}
              aria-label={isVisible ? `Hide ${label} from panelist` : `Show ${label} to panelist`}
              aria-pressed={!isVisible}
              className={`flex items-center justify-center size-[26px] rounded-[7px] border shrink-0 transition-colors focus-visible:ring-2 focus-visible:ring-[#707dff] outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                isVisible
                  ? 'bg-white border-[#e8ebf8] text-[#5a6382] hover:bg-[#f4f6ff] hover:border-[#e5e8ff] hover:text-[#707dff]'
                  : 'bg-[#fef2f2] border-[#fecaca] text-[#e11d48] hover:bg-[#fee2e2] hover:border-[#fca5a5]'
              }`}
            >
              {isVisible ? (
                <Eye className="size-[13px]" strokeWidth={2} />
              ) : (
                <EyeOff className="size-[13px]" strokeWidth={2} />
              )}
            </button>
          ) : null}
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
        {showVisibilityToggle && !isVisible ? (
          <p className="pt-[6px] flex items-center gap-[4px] font-sans font-medium text-[10px] leading-[14px] text-[#e11d48]">
            <EyeOff className="size-[10px]" strokeWidth={2} />
            Hidden from panelist
          </p>
        ) : null}
      </div>

      {/* Student readOnly: no edit/delete footer, but visibility is already in header. Keep spacing handled above. */}
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
 * place where comments are added/edited — defense copy of evaluation CommentsPanel
 * with student visibility toggle.
 *
 * Data source is the reactive `useAnnotation(documentId).state` (`pages` + `byUid`)
 * so the list stays live as annotations are created/updated/deleted. Native
 * document annotations (hyperlinks etc.) are filtered via isReviewAnnotation.
 *
 * Student mode: each card shows Eye / EyeOff toggle that persists isVisible
 * inside DefenseSubmissionAnnotation.data (per-annotation Json). Toggle is
 * optimistic, calls toggleDefenseAnnotationVisibility(submissionId, annotationId, isVisible),
 * and revalidates panelist cache tags so hidden annotations disappear for panelist
 * immediately. Panelist view filters hidden annotations (see getDefenseAnnotations).
 */
export function DefenseCommentsPanel({
  documentId,
  readOnly = false,
  isStudent = false,
  submissionId,
  initialAnnotations = null,
  autoEditId = null,
  highlightId = null,
  onClose,
  onCancelEdit,
  onSaveComment,
}: DefenseCommentsPanelProps) {
  const { state, provides } = useAnnotation(documentId)
  const scroll = useScroll(documentId)

  const persistedMap = useMemo(
    () => buildVisibilityMap(initialAnnotations),
    [initialAnnotations],
  )
  const [optimisticMap, setOptimisticMap] = useState<Map<string, boolean>>(
    () => new Map(),
  )
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const comments = useMemo<CommentItem[]>(() => {
    const items: CommentItem[] = []
    for (const [pageKey, uids] of Object.entries(state.pages)) {
      const pageIndex = Number(pageKey)
      for (const uid of uids) {
        const tracked = state.byUid[uid]
        if (!tracked) continue
        const obj = tracked.object
        if (!isReviewAnnotation(obj)) continue
        const created =
          obj.created instanceof Date
            ? obj.created.getTime()
            : typeof obj.created === 'number'
              ? obj.created
              : typeof obj.created === 'string'
                ? new Date(obj.created).getTime() || 0
                : 0
        const isVisible = resolveVisibility(obj.id, optimisticMap, persistedMap)
        items.push({
          id: obj.id,
          pageIndex,
          type: obj.type,
          author: obj.author?.trim() || 'Unknown',
          contents: obj.contents?.trim() || '',
          canComment: COMMENTABLE_TYPES.has(obj.type),
          created,
          isVisible,
        })
      }
    }
    return items.sort(
      (a, b) =>
        a.pageIndex - b.pageIndex ||
        a.created - b.created ||
        a.id.localeCompare(b.id),
    )
  }, [state, optimisticMap, persistedMap])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleJump(comment: CommentItem) {
    scroll.provides?.scrollToPage({
      pageNumber: comment.pageIndex + 1,
      behavior: 'smooth',
      alignY: 25,
    })
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

  function handleToggleVisibility(comment: CommentItem, nextVisible: boolean) {
    if (!submissionId) {
      toast.error('Submission not found — cannot update visibility.')
      return
    }
    const previous = resolveVisibility(comment.id, optimisticMap, persistedMap)
    setOptimisticMap((prev) => {
      const next = new Map(prev)
      next.set(comment.id, nextVisible)
      return next
    })
    setTogglingIds((prev) => {
      const next = new Set(prev)
      next.add(comment.id)
      return next
    })
    toggleDefenseAnnotationVisibility(submissionId, comment.id, nextVisible)
      .then((result) => {
        if (!result.success) {
          setOptimisticMap((prev) => {
            const next = new Map(prev)
            if (previous === (persistedMap.get(comment.id) ?? true)) {
              next.delete(comment.id)
            } else {
              next.set(comment.id, previous)
            }
            return next
          })
          toast.error(result.message || 'Failed to update visibility.')
        }
      })
      .catch(() => {
        setOptimisticMap((prev) => {
          const next = new Map(prev)
          if (previous === (persistedMap.get(comment.id) ?? true)) {
            next.delete(comment.id)
          } else {
            next.set(comment.id, previous)
          }
          return next
        })
        toast.error('Failed to update visibility. Please try again.')
      })
      .finally(() => {
        setTogglingIds((prev) => {
          const next = new Set(prev)
          next.delete(comment.id)
          return next
        })
      })
  }

  const showStudentSubtitle = isStudent
  const visibleCount = comments.filter((c) => c.isVisible).length
  const hiddenCount = comments.length - visibleCount

  return (
    <WorkspacePanel
      title="Comments"
      subtitle={
        showStudentSubtitle
          ? hiddenCount > 0
            ? `${comments.length} annotation${comments.length !== 1 ? 's' : ''} · ${hiddenCount} hidden from panelist · Click to jump to page.`
            : 'Reviewer annotations on this document. Use Eye to hide from panelist.'
          : readOnly
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
            <DefenseCommentCard
              key={comment.id}
              comment={comment}
              readOnly={readOnly}
              isStudent={isStudent}
              isVisible={comment.isVisible}
              isToggling={togglingIds.has(comment.id)}
              autoEdit={!readOnly && comment.id === autoEditId}
              highlighted={comment.id === highlightId}
              onJump={handleJump}
              onDelete={handleDelete}
              onSave={handleSave}
              onCancelEdit={onCancelEdit}
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>
      )}
    </WorkspacePanel>
  )
}
