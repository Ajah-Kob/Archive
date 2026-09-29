import { Clock, Eye } from 'lucide-react'
import { LatestDocumentCardRoot } from './DefenseDocumentCard/Root'
import { LatestDocumentCardHeader } from './DefenseDocumentCard/Header'
import { LatestDocumentCardBody } from './DefenseDocumentCard/Body'
import type { ResubmissionStatus } from '@/lib/defense/session-helpers'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ResubmittedDocument {
  fileName: string
  size: number
  blobUrl: string
  dateSubmitted: string
  submittedByName: string
  version: number
  isInitial?: boolean
  comments?: number | null
  pages?: number | null
  reviewedAt?: string | null
  annotationStats?: { comments: number; pages: number } | null
}

export type ResubmittedDocumentCardProps = {
  /** The document to display. Caller pins this to the version the panelist approved. */
  document?: ResubmittedDocument | null
  /**
   * The current panelist's own verdict for this document. The card is
   * panelist-specific: it must not derive status from other panelists' reviews,
   * or a panelist who approved would still see "Waiting for approval" because a
   * peer has not acted. Defaults to FOR_REVIEW.
   */
  myStatus?: ResubmissionStatus
  comments?: number | null
  pages?: number | null
  reviewedAt?: string | null
  workspaceHref?: string
  headerTitle?: string
  /** Whether current panelist already approved an earlier version (carry-forward) */
  hasApprovedPrevious?: boolean
}

// ── Pure helpers (<50 lines) ─────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** The initial document is never shown on the resubmission card. */
function resolveDocument(doc: ResubmittedDocument | null | undefined): ResubmittedDocument | null {
  if (!doc) return null
  return doc.isInitial ? null : doc
}

function getCircleClass(status: ResubmissionStatus): string {
  if (status === 'APPROVED') return 'bg-[#16a34a] border-[#cfebd6] rounded-[25px]'
  if (status === 'NEED_REVISION') return 'bg-[#e11d48] border-[#efd5da] rounded-[25px]'
  return 'bg-[#f59e0b] border-[#f2ddba] rounded-[50px]'
}

/** Pill styling for the panelist's own verdict. */
function getVerdictMeta(status: ResubmissionStatus) {
  if (status === 'APPROVED') {
    return {
      label: 'Approved',
      pill: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]',
    }
  }
  if (status === 'NEED_REVISION') {
    return {
      label: 'Need Revision',
      pill: 'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)] text-[#e11d48]',
    }
  }
  return {
    label: 'For Review',
    pill: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function ResubmittedDocumentCard({
  document,
  myStatus = 'FOR_REVIEW',
  comments,
  pages,
  reviewedAt,
  workspaceHref,
  headerTitle = 'Resubmitted Document',
  hasApprovedPrevious = false,
}: ResubmittedDocumentCardProps) {
  const latest = resolveDocument(document)
  if (!latest) {
    return (
      <LatestDocumentCardRoot>
        <LatestDocumentCardHeader>{headerTitle}</LatestDocumentCardHeader>
        <LatestDocumentCardBody>
          <p className="py-6 text-center font-sans font-medium text-[13px] text-[#8a93b4]">No resubmitted document yet.</p>
        </LatestDocumentCardBody>
      </LatestDocumentCardRoot>
    )
  }
  // The panelist's own verdict, supplied by the caller. Never derived from the
  // review list here: that is what made a panelist who had approved still see a
  // waiting state because a peer had not reviewed.
  const status: ResubmissionStatus = myStatus
  const verdict = getVerdictMeta(status)
  const circleClass = getCircleClass(status)
  const c = comments ?? latest.annotationStats?.comments ?? latest.comments ?? null
  const p = pages ?? latest.annotationStats?.pages ?? latest.pages ?? null
  const reviewed = reviewedAt ?? latest.reviewedAt ?? null
  const meta = `v${latest.version} · PDF · ${formatSize(latest.size)} · ${latest.dateSubmitted ? `${formatDate(latest.dateSubmitted)} · ` : ''}Submitted by ${latest.submittedByName}`
  const hasCounts = typeof c === 'number' && typeof p === 'number'
  const commentsLabel = hasCounts ? `${c} comments on ${p} pages` : null
  const isForReview = status === 'FOR_REVIEW'
  return (
    <LatestDocumentCardRoot>
      <LatestDocumentCardHeader>{headerTitle}</LatestDocumentCardHeader>
      <LatestDocumentCardBody>
        <div className="flex gap-[14px] items-start">
          <div className="flex flex-col items-center self-stretch shrink-0 pt-[2px]">
            <span aria-hidden="true" className={`size-[15px] border-2 border-solid shrink-0 ${circleClass}`} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-[10px] sm:flex-row sm:items-start sm:gap-[12px]">
            <div className="flex-1 min-w-0 flex flex-col items-start">
              <div className="flex items-center gap-[8px] min-w-0 flex-wrap">
                <h4 className="font-['Sora',sans-serif] font-bold text-[13px] leading-[normal] text-[#1e3a8a] truncate">{latest.fileName}</h4>
                <span className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] font-sans font-bold text-[11px] leading-[16.5px] whitespace-nowrap ${verdict.pill}`}>{verdict.label}</span>
              </div>
              <p className="pt-[4px] font-sans font-medium text-[12px] leading-[18px] text-[#6b7399] truncate w-full">{meta}</p>
              {isForReview ? (
                hasApprovedPrevious ? (
                  <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#16a34a]">
                    ✓ Previous document already approved. No need for review
                  </p>
                ) : (
                  <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#f59e0b] flex items-center gap-[5px]">
                    <Clock className="size-[9px] text-[#f59e0b]" strokeWidth={2.5} />
                    {hasApprovedPrevious
                      ? 'You approved an earlier version'
                      : 'Awaiting your review'}
                  </p>
                )
              ) : (
                <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
                  {commentsLabel ?? 'Reviewed'}{reviewed ? ` · ${formatDate(reviewed)}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-start gap-[10px] shrink-0">
              <a href={workspaceHref ?? latest.blobUrl} aria-label={`View ${latest.fileName}`} title="View document" className="flex items-center gap-[6px] h-[32px] px-[13px] rounded-[8px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0">
                <Eye className="size-[11px]" strokeWidth={2} /> View
              </a>
            </div>
          </div>
        </div>
      </LatestDocumentCardBody>
    </LatestDocumentCardRoot>
  )
}

export default ResubmittedDocumentCard
