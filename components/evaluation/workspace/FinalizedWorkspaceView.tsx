'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, CalendarDays, Lock, MessageSquareText } from 'lucide-react'
import type { AnnotationTransferItem } from '@embedpdf/plugin-annotation'
import { PdfViewer } from '@/components/evaluation/workspace/PdfViewer'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import { deserializeAnnotations } from '@/lib/annotations-serializer'
import { useIsCoarsePointer } from '@/lib/hooks/useMediaQuery'
import { MobileUnsupported } from '@/components/workspace/MobileUnsupported'
import { ReadOnlyCommentsPanel } from '@/components/workspace/ReadOnlyCommentsPanel'
import type { SubmissionMeta } from '@/types/milestones'

export interface FinalizedWorkspaceViewProps {
  /** Submission metadata (status is APPROVED / NEEDS_REVISION here). */
  submission: SubmissionMeta
  /** Committed annotations (serialized AnnotationTransferItem[] JSON). */
  initialAnnotations: unknown[] | null
  /**
   * True when this tab opens a SUPERSEDED (soft-deleted) version rather than
   * the milestone's current submission — the banner wording adapts.
   */
  isSuperseded?: boolean
  /** Back-link target (defaults to the document-review list). */
  backHref?: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Read-only view of a FINALIZED evaluation (verdict already submitted).
 *
 * The coordinator can no longer evaluate or edit anything — the committed
 * annotations are rendered inside the drop-in PdfViewer with all pointer
 * interaction disabled (see the `.read-only` rule in globals.css), mirroring
 * what students see on their side. No toolbar, no draft auto-save, no verdict
 * actions.
 */
export function FinalizedWorkspaceView(props: FinalizedWorkspaceViewProps) {
  // Desktop only, as the review workspace. Before the PDF fetch so a touch
  // device never downloads the document just to hide it.
  if (useIsCoarsePointer()) return <MobileUnsupported />
  return <FinalizedWorkspaceViewInner {...props} />
}

function FinalizedWorkspaceViewInner({
  submission,
  initialAnnotations,
  isSuperseded = false,
  backHref,
}: FinalizedWorkspaceViewProps) {
  // Decode persisted items (base64 stamp data → ArrayBuffer) before the
  // viewer imports them — same hydration path as useAnnotationDraft.
  const annotations = deserializeAnnotations(initialAnnotations ?? [])
  const [showComments, setShowComments] = useState(false)
  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#fafbff]">
      {/* Header bar: back + context | finalized notice */}
      <header className="flex items-center gap-[14px] px-6 h-[64px] bg-white border-b border-[#eceef8] shrink-0">
        <Link
          href={backHref ?? '/faculty/document-review'}
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

        <div className="flex-1" />

        {/* Finalized notice */}
        <div className="flex items-center gap-[8px] shrink-0">
          {submission.reviewedAt && (
            <span className="flex items-center gap-[6px] font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
              <CalendarDays
                className="size-[12px] text-[#9ea8c6]"
                strokeWidth={1.75}
              />
              Reviewed{' '}
              {formatDate(submission.reviewedAt)}
              {submission.reviewedBy ? ` by ${submission.reviewedBy}` : ''}
            </span>
          )}
          <span className="flex items-center gap-[6px] h-[32px] px-[12px] rounded-[8px] bg-[#f4f5fc] border border-[#e0e3f0] font-sans font-semibold text-[11.5px] leading-[17px] text-[#5a6382]">
            <Lock className="size-[12px] text-[#9ea8c6]" strokeWidth={2.25} />
            {isSuperseded ? 'Previous version — read-only' : 'Evaluation finalized'}
          </span>
          {/* Same affordance the finalized defense view has: a read-only list
              that jumps to an annotation. Read-only here is navigation only. */}
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
            {annotations.length > 0 && (
              <span className="font-sans font-bold text-[10.5px] text-[#707dff]">
                {annotations.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {submission.reviewNote && (
        <div className="px-6 py-[10px] bg-[rgba(245,158,11,0.06)] border-b border-[rgba(245,158,11,0.18)] shrink-0">
          <p className="font-sans font-medium text-[12px] leading-[18px] text-[#92610a]">
            Revision note: {submission.reviewNote}
          </p>
        </div>
      )}

      {/* The panel is rendered by PdfViewer from inside its EmbedPDF tree, not
          here as a sibling. useScroll resolves EmbedPDF's context, so a panel
          mounted outside it cannot scroll to a page -- which is why the first
          version of this showed the list but never navigated. */}
      <div className="flex-1 min-h-0 relative bg-[#e8eaf4] epdf-viewer-area read-only">
        <PdfViewer
          src={submission.blobUrl}
          annotationAuthor={submission.reviewedBy ?? 'Adviser'}
          initialAnnotations={annotations as unknown as AnnotationTransferItem[]}
          renderPanel={(id) =>
            showComments ? (
              <ReadOnlyCommentsPanel
                documentId={id}
                annotations={annotations}
                onClose={() => setShowComments(false)}
              />
            ) : null
          }
          readOnly
        />
      </div>
    </div>
  )
}
