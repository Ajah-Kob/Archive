'use client'

import { MessageSquareText } from 'lucide-react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import { useScroll } from '@embedpdf/plugin-scroll/react'
// The defense copy of WorkspacePanel is used deliberately: it is the variant
// that takes the panel out of flow below sm. The evaluation copy is still the
// older inline-only version.
import { WorkspacePanel } from '@/components/defense/workspace/WorkspacePanel'

/**
 * Read-only comments list for the finalized (verdicted) workspaces.
 *
 * Navigation only — no editing. Clicking a comment selects its annotation and
 * scrolls the viewer to that page.
 *
 * Lives here rather than inside either finalized view because both need it and
 * the logic is self-contained: ~60 lines of identical presentational code that
 * would otherwise sit in two 500+ line files.
 */
export interface ReadOnlyCommentsPanelProps {
  /** Active EmbedPDF document id — needed to select and scroll to the annotation. */
  documentId: string
  /** Serialized AnnotationTransferItem[] for this submission. */
  annotations: unknown[]
  onClose: () => void
}

function CommentCard({ item, onClick }: { item: unknown; onClick?: () => void }) {
  const ann = (item as { annotation?: Record<string, unknown> }).annotation as
    | { author?: string; contents?: string; pageIndex?: number }
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
        <p className="shrink-0 font-sans font-bold text-[12.5px] leading-[18.75px] text-[#3d4566]">
          Comment
        </p>
        {pageIndex != null && (
          <span className="shrink-0 bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff]">
            Page {pageIndex}
          </span>
        )}
        <div className="flex-1" />
        <p className="truncate font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
          {author}
        </p>
      </div>
      <p className="pt-[8px] font-sans font-medium text-[12px] leading-[18px] text-[#5a6382] text-left">
        {contents || 'No text — annotation on page.'}
      </p>
    </button>
  )
}

export function ReadOnlyCommentsPanel({
  documentId,
  annotations,
  onClose,
}: ReadOnlyCommentsPanelProps) {
  const { provides: annotationProvides } = useAnnotation(documentId)
  const scroll = useScroll(documentId)

  function handleCommentClick(item: unknown) {
    const ann = (item as { annotation?: { pageIndex?: number; id?: string } }).annotation
    const pageIndex = typeof ann?.pageIndex === 'number' ? ann.pageIndex : 0
    const id = typeof ann?.id === 'string' ? ann.id : ''
    if (annotationProvides) {
      try {
        annotationProvides.selectAnnotation(pageIndex, id)
      } catch {}
    }
    const scrollProvides = (
      scroll as unknown as {
        provides?: {
          scrollToPage?: (opts: {
            pageNumber: number
            behavior?: string
            alignY?: number
          }) => void
        }
      }
    )?.provides
    if (scrollProvides?.scrollToPage) {
      try {
        scrollProvides.scrollToPage({ pageNumber: pageIndex + 1, behavior: 'smooth', alignY: 25 })
      } catch {}
    } else {
      // Older plugin builds expose no scrollToPage; fall back to the DOM node.
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
          <p className="pt-[8px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">
            No comments yet
          </p>
          <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px]">
            Annotations you saved will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {annotations.map((item, idx) => (
            <CommentCard
              key={
                (item as { annotation?: { id?: string } }).annotation?.id ?? String(idx)
              }
              item={item}
              onClick={() => handleCommentClick(item)}
            />
          ))}
        </div>
      )}
    </WorkspacePanel>
  )
}