import { Eye } from 'lucide-react'
import { CircleHistoryState } from './CircleHistoryState'
import { StatusPill } from './StatusPill'
import { GhostButton } from './GhostButton'

export interface ResubmittedDocumentInfo {
  fileName: string
  size: number
  blobUrl: string
  submittedAt?: string
  dateSubmitted?: string
  submittedByName: string
  version: number
  status: 'FOR_REVIEW' | 'APPROVED' | 'NEED_REVISION' | 'REJECTED'
  approvedCount: number
  totalPanelists?: number
  comments?: number
  pages?: number
  reviewedAt?: string
  previousVersionApproved?: boolean
}

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

/**
 * Resubmitted document row — Figma 1471:6192 (drawer) & 1480:7809 (latest card)
 * - For Review: no 1/3, shows Waiting for approval OR Previous version already approved
 * - Approved / Need Revision: shows 1/3 approve · 4 comments on 3 pages · Reviewed May 32
 * Global 1/3 = approvedCount / totalPanelists
 */
export function LatestDocumentCardResubmitted({
  document,
  showConnector,
  connectorDashed,
}: {
  document: ResubmittedDocumentInfo
  showConnector?: boolean
  connectorDashed?: boolean
}) {
  const dateRaw = document.submittedAt ?? document.dateSubmitted ?? ''
  const dateLabel = dateRaw ? formatDate(dateRaw) : ''
  const sizeLabel = formatSize(document.size)
  const meta = `v${document.version} · PDF · ${sizeLabel} · ${dateRaw ? `${dateLabel} · ` : ''}Submitted by ${document.submittedByName}`
  const total = document.totalPanelists ?? 3
  const isForReview = document.status === 'FOR_REVIEW'
  const isApproved = document.status === 'APPROVED'
  const isNeedRevision = document.status === 'NEED_REVISION' || document.status === 'REJECTED'

  // Pill state mapping for Figma
  const pillState = isApproved ? 'Approved' : isNeedRevision ? 'Rejected' : 'For Review'
  const circleState = isForReview ? 'In Review' : isNeedRevision ? 'Need Revision' : 'Approved'

  const approvedLabel = `${document.approvedCount}/${total} approve`
  const commentsLabel =
    typeof document.comments === 'number' && typeof document.pages === 'number'
      ? `${document.comments} comments on ${document.pages} pages`
      : null

  return (
    <div className="flex gap-[14px] items-start">
      <div className="flex flex-col items-center self-stretch shrink-0 pt-[2px]">
        <CircleHistoryState state={circleState as any} />
        {showConnector ? (
          <span className={`w-[2px] flex-1 min-h-[24px] ${connectorDashed ? 'border-l border-dashed border-[#e8ebf8]' : 'bg-[#e8ebf8]'}`} />
        ) : null}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-[10px] sm:flex-row sm:items-start sm:gap-[12px]">
        <div className="flex-1 min-w-0 flex flex-col items-start">
          <div className="flex items-center gap-[8px] min-w-0 flex-wrap">
            <h4 className="font-['Sora',sans-serif] font-bold text-[13px] leading-[normal] text-[#1e3a8a] truncate">{document.fileName}</h4>
            <StatusPill state={pillState as any} />
          </div>

          <p className="pt-[4px] font-sans font-medium text-[12px] leading-[18px] text-[#6b7399] truncate w-full">{meta}</p>

          {/* Added in new Figma: 1/3 + comments + reviewed date */}
          {isApproved || isNeedRevision ? (
            <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
              {approvedLabel}
              {commentsLabel ? ` · ${commentsLabel}` : ''}
              {document.reviewedAt ? ` · Reviewed ${formatDate(document.reviewedAt)}` : ''}
            </p>
          ) : null}

          {isForReview && document.previousVersionApproved ? (
            <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#22c55e]">✓ Previous version already approved</p>
          ) : null}
          {isNeedRevision && document.previousVersionApproved ? (
            <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#22c55e]">✓ Previous version already approved</p>
          ) : null}
          {isForReview && !document.previousVersionApproved ? (
            <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#f59e0b] flex items-center gap-[5px]">
              <span className="size-[9px] rounded-full bg-[#f59e0b]" />
              Waiting for approval
            </p>
          ) : null}
        </div>

        <div className="flex items-start gap-[10px] shrink-0">
          <GhostButton href={document.blobUrl} icon={<Eye className="size-[11px]" />}>
            View
          </GhostButton>
        </div>
      </div>
    </div>
  )
}
