import { type ChapterVersionItem } from '@/types/milestones'
import { FileText, Eye, Clock3 } from 'lucide-react'
import { toast } from 'sonner'
import { blobUrlToPathname, toSignedBlobPath } from '@/lib/blob'

/**
 * Submission History — student chapter view.
 *
 * Recreated from the Figma design (node 1340:12179): timeline rail with
 * filled status circles, "Version N" title with an inline status pill,
 * submitted-by meta line, and a comments/reviewed line (or an amber
 * "Awaiting adviser review" hint for pending versions).
 *
 * The card fills the remaining page height; only the rows scroll.
 */

/** Timeline circle colors per status (Figma CircleHistoryStates). */
const CIRCLE_STYLES = {
  APPROVED: 'bg-[#16a34a] border-[#cfebd6]',
  NEEDS_REVISION: 'bg-[#e11d48] border-[#efd5da]',
  IN_REVIEW: 'bg-[#f59e0b] border-[#f2ddba]',
  SUPERSEDED: 'bg-[#e0e3f0] border-[#cdd3ea]',
} as const

/** Status pill styles + labels (Figma DocumentStatusPill). */
const PILL_STYLES = {
  APPROVED: {
    classes: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]',
    label: 'Approved',
  },
  NEEDS_REVISION: {
    classes: 'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)] text-[#e11d48]',
    label: 'Needs Revision',
  },
  IN_REVIEW: {
    classes: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
    label: 'In Review',
  },
  SUPERSEDED: {
    classes: 'bg-[#f4f5fc] border-[#e0e3f0] text-[#9ea8c6]',
    label: 'Superseded',
  },
} as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface SubmissionVersionRowProps {
  version: ChapterVersionItem
  isLast: boolean
}

function SubmissionVersionRow({ version, isLast }: SubmissionVersionRowProps) {
  const pill = PILL_STYLES[version.status]
  const commentCount = version.commentCount ?? 0

  // Private Blob: DB stores `version.blobUrl` as https://…vercel-storage.com/chapter/{groupId}/…
  // but the client never renders that raw URL in <a href> or EmbedPDF src.
  // Derive the Vercel pathname via blobUrlToPathname (new URL(blobUrl).pathname slice)
  // and fetch through the auth-gated signed route GET /api/blob/{pathname}.
  // The route enforces group-member/adviser/coordinator/chair gates (section-scoped)
  // and returns 401/403 for anonymous/cross-section callers. Viewers handle those
  // with a toast and render the PDF from a fetched object URL, not the raw blobUrl.
  const signedHref = toSignedBlobPath(version.blobUrl)
  const pathname = blobUrlToPathname(version.blobUrl)

  async function handleSignedDirectView() {
    if (!signedHref || !pathname.startsWith('chapter/')) {
      toast.error('Invalid document link.')
      return
    }
    try {
      const res = await fetch(signedHref, { credentials: 'include' })
      if (res.status === 401) {
        toast.error('Please sign in to view this document.')
        return
      }
      if (res.status === 403) {
        toast.error('You do not have access to this document.')
        return
      }
      if (!res.ok) {
        toast.error('Failed to load document.')
        return
      }
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as { url?: string; downloadUrl?: string }
        const url = data.downloadUrl ?? data.url
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer')
          return
        }
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      console.error('[SubmissionHistory | signed view failed]:', err)
      toast.error('Failed to load document.')
    }
  }

  return (
    <div className='flex gap-[14px] items-start'>
      {/* Timeline rail: filled status circle + connector */}
      <div className='flex flex-col items-center self-stretch shrink-0'>
        <span
          className={`size-[15px] border-2 rounded-[25px] shrink-0 ${CIRCLE_STYLES[version.status]}`}
        />
        {!isLast && (
          <span className='w-[2px] flex-1 min-h-[24px] bg-[#e8ebf8]' />
        )}
      </div>

      {/* Content */}
      <div className='flex gap-[12px] items-start min-w-0 flex-1 pb-[20px]'>
        <div className='flex flex-col min-w-0 flex-1'>
          {/* Title + inline status pill */}
          <div className='flex items-center gap-[8px] min-w-0'>
            <h4 className='font-sora font-bold text-[13px] leading-[19.5px] text-[#1e3a8a] whitespace-nowrap'>
              Version {version.version}
            </h4>
            <span
              className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] font-bold text-[11px] leading-[16.5px] whitespace-nowrap ${pill.classes}`}
            >
              {pill.label}
            </span>
          </div>

          {/* Submitted meta */}
          <p className='pt-[4px] font-medium text-[12px] leading-[18px] text-[#6b7399] truncate'>
            {formatDate(version.submittedAt)} · Submitted by{' '}
            {version.submittedBy || 'Unknown'} · {formatSize(version.size)}
          </p>

          {/* Comments / review state */}
          {version.status === 'IN_REVIEW' ? (
            <p className='flex items-center gap-[5px] py-[3px] font-medium text-[12px] leading-[18px] text-[#f59e0b]'>
              <Clock3 className='size-[9.5px]' strokeWidth={2} />
              Awaiting adviser review
            </p>
          ) : (
            <p className='py-[3px] font-medium text-[12px] leading-[18px] text-[#9ea8c6]'>
              {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
              {version.reviewedAt && ` · Reviewed ${formatDate(version.reviewedAt)}`}
            </p>
          )}
        </div>

        {/* View button — opens that version's read-only document workspace */}
        <a
          href={`/student/milestone/review/${version.id}`}
          target='_blank'
          rel='noopener noreferrer'
          className='flex h-[32px] w-[74px] shrink-0 items-center justify-center gap-[5px] rounded-[8px] border border-[#e0e3f0] bg-[#f0f2fa] px-[13px] font-bold text-[12px] text-[#5a6382] hover:bg-[#e8ebf8] transition-colors'
        >
          <Eye className='size-[11px]' />
          View
        </a>
      </div>
    </div>
  )
}

interface SubmissionHistoryProps {
  history: ChapterVersionItem[]
}

export function SubmissionHistory({ history }: SubmissionHistoryProps) {
  return (
    <div className='flex flex-col flex-1 min-h-0 overflow-hidden rounded-[14px] border border-[#eceef8] bg-white shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)]'>
      {/* Fixed header */}
      <div className='shrink-0 px-[18px] pt-[14px] pb-[13px] border-b border-[#f0f2fa]'>
        <h3 className='font-sora font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a]'>
          Submission History
        </h3>
      </div>

      {history.length === 0 ? (
        <div className='flex flex-col items-center gap-3 px-[16px] py-[28px] text-center'>
          <div className='flex size-[48px] items-center justify-center rounded-[24px] bg-[#f4f5fc]'>
            <FileText className='size-[24px] text-[#707dff]' />
          </div>
          <p className='font-sora text-[13px] font-semibold text-[#1e3a8a]'>No Submission History</p>
          <p className='text-[11.5px] text-[#9ea8c6]'>Uploaded documents will appear here once you submit a file.</p>
        </div>
      ) : (
        /* Scrollable rows area */
        <div className='flex-1 min-h-0 overflow-y-auto px-[20px] pt-[18px]'>
          {history.map((v, i) => (
            <SubmissionVersionRow key={v.id} version={v} isLast={i === history.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
