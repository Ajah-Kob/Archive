import { Clock, Eye, FileSearch } from 'lucide-react'
import { LatestDocumentCardRoot } from './LatestDocumentCard/Root'
import { LatestDocumentCardHeader } from './LatestDocumentCard/Header'
import { LatestDocumentCardBody } from './LatestDocumentCard/Body'
import { deriveResubmissionStatus } from '@/lib/defense/session-helpers'
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
  reviews?: Array<{ status: string }>
}

export type ResubmittedDocumentCardProps = {
  /** Latest resubmitted document (isInitial === false). Caller should pass latest !isInitial. */
  document?: ResubmittedDocument | null
  /** Alternative: full submissions list — component picks latest !isInitial. */
  submissions?: Array<ResubmittedDocument & { isInitial: boolean }>
  /** Alternative: resubmissions list (already filtered !isInitial). */
  resubmissions?: Array<ResubmittedDocument>
  /** Per-panelist reviews for the latest version — used to derive status & 1/3. */
  reviews?: Array<{ status: string }>
  totalPanelists?: number
  /** Overrides derived counts when provided. */
  approvedCount?: number
  comments?: number | null
  pages?: number | null
  reviewedAt?: string | null
  workspaceHref?: string
  headerTitle?: string
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

function resolveLatest(
  doc: ResubmittedDocument | null | undefined,
  submissions?: Array<ResubmittedDocument & { isInitial: boolean }>,
  resubmissions?: Array<ResubmittedDocument>,
): ResubmittedDocument | null {
  if (doc) {
    if (doc.isInitial) return null
    return doc
  }
  const fromResub = resubmissions && resubmissions.length > 0 ? resubmissions[resubmissions.length - 1] : null
  if (fromResub) return fromResub.isInitial ? null : fromResub
  const filtered = submissions?.filter((s) => !s.isInitial) ?? []
  if (filtered.length === 0) return null
  return filtered[filtered.length - 1]
}

function getPillMeta(status: ResubmissionStatus) {
  if (status === 'APPROVED') {
    return { label: 'Approved', className: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]' }
  }
  if (status === 'NEED_REVISION') {
    return { label: 'Need Revision', className: 'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)] text-[#e11d48]' }
  }
  return { label: 'For Review', className: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]' }
}

function getCircleClass(status: ResubmissionStatus): string {
  if (status === 'APPROVED') return 'bg-[#16a34a] border-[#cfebd6] rounded-[25px]'
  if (status === 'NEED_REVISION') return 'bg-[#e11d48] border-[#efd5da] rounded-[25px]'
  return 'bg-[#f59e0b] border-[#f2ddba] rounded-[50px]'
}

// ── Component ────────────────────────────────────────────────────────────────

export function ResubmittedDocumentCard({
  document,
  submissions,
  resubmissions,
  reviews,
  totalPanelists,
  approvedCount,
  comments,
  pages,
  reviewedAt,
  workspaceHref,
  headerTitle = 'Resubmitted Document',
}: ResubmittedDocumentCardProps) {
  const latest = resolveLatest(document, submissions, resubmissions)
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
  const effectiveReviews = reviews ?? (latest.reviews as Array<{ status: string }> | undefined) ?? []
  const status: ResubmissionStatus = deriveResubmissionStatus(effectiveReviews)
  const pill = getPillMeta(status)
  const circleClass = getCircleClass(status)
  const total = totalPanelists ?? (effectiveReviews.length > 0 ? effectiveReviews.length : 3)
  const approved = typeof approvedCount === 'number' ? approvedCount : effectiveReviews.filter((r) => r.status === 'APPROVED').length
  const ann = (latest as ResubmittedDocument).annotationStats
  const c = comments ?? ann?.comments ?? (latest as ResubmittedDocument).comments ?? null
  const p = pages ?? ann?.pages ?? (latest as ResubmittedDocument).pages ?? null
  const reviewed = reviewedAt ?? (latest as ResubmittedDocument).reviewedAt ?? null
  const meta = `v${latest.version} · PDF · ${formatSize(latest.size)} · ${latest.dateSubmitted ? `${formatDate(latest.dateSubmitted)} · ` : ''}Submitted by ${latest.submittedByName}`
  const hasCounts = typeof c === 'number' && typeof p === 'number'
  const approvedLabel = `${approved}/${total} approve`
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
                <span className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] font-sans font-bold text-[11px] leading-[16.5px] whitespace-nowrap ${pill.className}`}>{pill.label}</span>
              </div>
              <p className="pt-[4px] font-sans font-medium text-[12px] leading-[18px] text-[#6b7399] truncate w-full">{meta}</p>
              {isForReview ? (
                <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#f59e0b] flex items-center gap-[5px]">
                  <Clock className="size-[9px] text-[#f59e0b]" strokeWidth={2.5} /> Waiting for approval
                </p>
              ) : (
                <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
                  {approvedLabel}
                  {commentsLabel ? ` · ${commentsLabel}` : ''}{reviewed ? ` · Reviewed ${formatDate(reviewed)}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-start gap-[10px] shrink-0">
              {isForReview ? (
                <a href={workspaceHref ?? latest.blobUrl} aria-label={`Review ${latest.fileName} in document workspace`} title="Open in document workspace to review" className="flex items-center gap-[6px] h-[36px] px-[16px] rounded-[9px] bg-[#707dff] text-white font-sans font-bold text-[12.5px] leading-[18.75px] shadow-[0_3px_8px_rgba(112,125,255,0.24)] border border-[rgba(255,255,255,0.4)] hover:bg-[#5565ff] hover:shadow-[0_4px_12px_rgba(112,125,255,0.32)] transition-all focus-visible:ring-2 focus-visible:ring-[#707dff] focus-visible:ring-offset-2 outline-none shrink-0">
                  <FileSearch className="size-[13px]" strokeWidth={2} /> Review Document
                </a>
              ) : (
                <a href={workspaceHref ?? latest.blobUrl} aria-label={`View ${latest.fileName}`} title="View document" className="flex items-center gap-[6px] h-[32px] px-[13px] rounded-[8px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0">
                  <Eye className="size-[11px]" strokeWidth={2} /> View
                </a>
              )}
            </div>
          </div>
        </div>
      </LatestDocumentCardBody>
    </LatestDocumentCardRoot>
  )
}

export default ResubmittedDocumentCard
