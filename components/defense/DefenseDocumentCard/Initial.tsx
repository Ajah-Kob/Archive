import { Eye, FileSearch } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { CircleHistoryState } from './CircleHistoryState'
import { StatusPill } from './StatusPill'
import { GhostButton } from './GhostButton'
import { StatusLine } from './StatusLine'

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal document shape consumed by LatestDocumentCard.Initial.
 * Compatible with DefenseSubmission, DefenseSubmissionItem, and DefenseDocumentInfo.
 * No hardcoded values — all display data comes from props.
 */
export interface LatestDocumentInfo {
  fileName: string
  size: number
  blobUrl: string
  submittedAt?: string
  dateSubmitted?: string
  submittedByName: string
  version?: number
}

export type InitialDocumentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'MINOR_REVISION'
  | 'MAJOR_REVISION'
  | 'REDEFENSE'
  | 'IN_REVIEW'

type LatestDocumentCardInitialProps = {
  document: LatestDocumentInfo & { comments?: number | null; pages?: number | null; reviewedAt?: string | null }
  status: InitialDocumentStatus | string
  /** When set, renders a vertical connector under the circle (for timeline). */
  showConnector?: boolean
  connectorDashed?: boolean
  /** Optional extra action beside View (e.g. Replace when PENDING). */
  extraAction?: React.ReactNode
  /** Optional href for annotation workspace; falls back to blobUrl when absent. */
  workspaceHref?: string
  /** Whether current panelist has already submitted annotation (COMMITTED) — controls View vs Review styling */
  hasReviewed?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function resolveDate(doc: LatestDocumentInfo): string {
  return doc.submittedAt ?? doc.dateSubmitted ?? ''
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Initial document row — Figma 1471-6082.
 * Title Sora bold 13px #1e3a8a, meta 12px #6b7399 (v{version} · PDF·size·date·submittedBy),
 * 15px circle + 7px status pill, amber status line when PENDING, ghost View button.
 * Props-driven: no hardcoded fileName/size/date.
 * Responsive: stacks action below content on narrow viewports via sm breakpoint.
 */
export function LatestDocumentCardInitial({
  document,
  status,
  showConnector,
  connectorDashed,
  extraAction,
  workspaceHref,
  hasReviewed = false,
}: LatestDocumentCardInitialProps) {
  const isNoVerdict = status === 'PENDING'
  const isInReview = status === 'IN_REVIEW'
  const isReviewPending = status === 'PENDING' || status === 'IN_REVIEW'
  const showReviewAction = isReviewPending && !hasReviewed

  const dateRaw = resolveDate(document)
  const dateLabel = dateRaw ? formatDate(dateRaw) : ''
  const sizeLabel = formatSize(document.size)

  const versionPrefix =
    typeof document.version === 'number' ? `v${document.version} · ` : ''

  // Figma 1471-5962 meta: version · PDF · size · date · submittedBy
  // Falls back to version-agnostic when version is absent.
  const meta =
    versionPrefix && dateLabel
      ? `${versionPrefix}PDF · ${sizeLabel} · ${dateLabel} · Submitted by ${document.submittedByName}`
      : dateLabel
        ? `PDF · ${sizeLabel} · ${dateLabel} · Submitted by ${document.submittedByName}`
        : `PDF · ${sizeLabel} · Submitted by ${document.submittedByName}`

  return (
    <div className="flex gap-[14px] items-start">
      {/* Timeline rail: 15px circle + optional connector */}
      <div className="flex flex-col items-center self-stretch shrink-0 pt-[2px]">
        <CircleHistoryState state={status} />
        {showConnector ? (
          <span
            className={`w-[2px] flex-1 min-h-[24px] ${
              connectorDashed
                ? 'border-l border-dashed border-[#e8ebf8]'
                : 'bg-[#e8ebf8]'
            }`}
          />
        ) : null}
      </div>

      {/* Content + actions: responsive stack */}
      <div className="flex-1 min-w-0 flex flex-col gap-[10px] sm:flex-row sm:items-start sm:gap-[12px]">
        <div className="flex-1 min-w-0 flex flex-col items-start">
          {/* Title + status pill */}
          <div className="flex items-center gap-[8px] min-w-0 flex-wrap">
            <h4 className="font-['Sora',sans-serif] font-bold text-[13px] leading-[normal] text-[#1e3a8a] truncate">
              {document.fileName}
            </h4>
            {!isNoVerdict ? <StatusPill state={status} /> : null}
          </div>

          {/* Meta line 12px #6b7399 */}
          <p className="pt-[4px] font-sans font-medium text-[12px] leading-[18px] text-[#6b7399] truncate w-full">
            {meta}
          </p>

          {/* Annotation counts when verdict submitted */}
          {!isNoVerdict && !isInReview && (document as unknown as { comments?: number | null; pages?: number | null; reviewedAt?: string | null }).comments != null && (
            <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
              {(document as unknown as { comments?: number | null; pages?: number | null }).comments} comments on {(document as unknown as { pages?: number | null }).pages} pages
              {(document as unknown as { reviewedAt?: string | null }).reviewedAt
                ? ` · Reviewed ${formatDate((document as unknown as { reviewedAt?: string | null }).reviewedAt!)}`
                : ''}
            </p>
          )}
          {!isNoVerdict && !isInReview && (document as unknown as { comments?: number | null }).comments == null && (document as unknown as { reviewedAt?: string | null }).reviewedAt && (
            <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
              Reviewed {formatDate((document as unknown as { reviewedAt?: string | null }).reviewedAt!)}
            </p>
          )}

          {/* Status line per Figma typography 12px medium */}
          {isNoVerdict ? (
            <StatusLine tone="amber">
              Wait for your defense schedule and verdict
            </StatusLine>
          ) : null}
          {isInReview ? (
            <StatusLine tone="amber">Waiting for panelist approvals</StatusLine>
          ) : null}
        </div>

        {/* Actions: Review Document (purple) when pending/in review and not yet reviewed, else View (grey) */}
        <div className="flex items-start gap-[10px] shrink-0">
          {showReviewAction ? (
            <a
              href={workspaceHref ?? document.blobUrl}
              aria-label={`Review ${document.fileName} in document workspace`}
              title="Open in document workspace to review"
              className="flex items-center gap-[6px] h-[36px] px-[16px] rounded-[9px] bg-[#707dff] text-white font-sans font-bold text-[12.5px] leading-[18.75px] shadow-[0_3px_8px_rgba(112,125,255,0.24)] border border-[rgba(255,255,255,0.4)] hover:bg-[#5565ff] hover:shadow-[0_4px_12px_rgba(112,125,255,0.32)] transition-all focus-visible:ring-2 focus-visible:ring-[#707dff] focus-visible:ring-offset-2 outline-none shrink-0"
            >
              <FileSearch className="size-[13px]" strokeWidth={2} />
              Review Document
            </a>
          ) : (
            <a
              href={workspaceHref ?? document.blobUrl}
              aria-label={`View ${document.fileName}`}
              title="View document"
              className="flex items-center gap-[6px] h-[32px] px-[13px] rounded-[8px] bg-[#f0f2fa] border border-[#e0e3f0] font-sans font-bold text-[12px] leading-[18px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0"
            >
              <Eye className="size-[11px]" strokeWidth={2} />
              View
            </a>
          )}
          {extraAction}
        </div>
      </div>
    </div>
  )
}
