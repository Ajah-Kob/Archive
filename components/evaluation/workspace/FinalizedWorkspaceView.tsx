'use client'

import Link from 'next/link'
import { ArrowLeft, CalendarDays, Lock } from 'lucide-react'
import type { AnnotationTransferItem } from '@embedpdf/plugin-annotation'
import { PdfViewer } from '@/components/evaluation/workspace/PdfViewer'
import { SubmissionStatusBadge } from '@/components/milestones/chapter/SubmissionStatusBadge'
import { deserializeAnnotations } from '@/lib/annotations-serializer'
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
export function FinalizedWorkspaceView({
  submission,
  initialAnnotations,
  isSuperseded = false,
}: FinalizedWorkspaceViewProps) {
  // Decode persisted items (base64 stamp data → ArrayBuffer) before the
  // viewer imports them — same hydration path as useAnnotationDraft.
  const annotations = deserializeAnnotations(initialAnnotations ?? [])
  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#fafbff]">
      {/* Header bar: back + context | finalized notice */}
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

        <div className="flex-1" />

        {/* Finalized notice */}
        <div className="flex items-center gap-[8px] shrink-0">
          <span className="flex items-center gap-[6px] h-[32px] px-[12px] rounded-[8px] bg-[#f4f5fc] border border-[#e0e3f0] font-sans font-semibold text-[11.5px] leading-[17px] text-[#5a6382]">
            <Lock className="size-[12px] text-[#9ea8c6]" strokeWidth={2.25} />
            {isSuperseded ? 'Previous version — read-only' : 'Evaluation finalized'}
          </span>
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
        </div>
      </header>

      {submission.reviewNote && (
        <div className="px-6 py-[10px] bg-[rgba(245,158,11,0.06)] border-b border-[rgba(245,158,11,0.18)] shrink-0">
          <p className="font-sans font-medium text-[12px] leading-[18px] text-[#92610a]">
            Revision note: {submission.reviewNote}
          </p>
        </div>
      )}

      {/* Read-only document viewer — annotations visible but not interactive */}
      <div className="flex-1 min-h-0 relative bg-[#e8eaf4] epdf-viewer-area read-only">
        <PdfViewer
          src={submission.blobUrl}
          annotationAuthor={submission.reviewedBy ?? 'Adviser'}
          initialAnnotations={annotations as unknown as AnnotationTransferItem[]}
        />
      </div>
    </div>
  )
}
