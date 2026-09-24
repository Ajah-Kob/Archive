'use client'

import { createContext, use } from 'react'
import { Crown, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import type { DefenseReviewStatus, PanelistRole } from '@prisma/client'
import { getInitials } from '@/lib/helper'
import {
  UserProfile,
  PANELIST_AVATAR_GRADIENT,
} from '@/components/ui/UserProfile'
import {
  isPanelistReadOnly,
  shouldResetOnResubmission,
} from '@/lib/defense/session-helpers'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApprovalChecklistReview {
  panelistId: number
  status: DefenseReviewStatus | string
  feedback?: { comments: number; pages: number } | null
  comments?: number
  pages?: number
  reviewedAt?: string | Date | null
  reviewed_at?: string | Date | null
}

export interface ApprovalChecklistPanelist {
  userId: number
  name: string
  email: string
  image: string | null
  role: PanelistRole
}

export interface ApprovalChecklistCardProps {
  panelists: ApprovalChecklistPanelist[]
  reviews: ApprovalChecklistReview[]
  title?: string
  className?: string
}

// ── Context (composition via createContext + use()) ──────────────────────────

interface ApprovalChecklistContextValue {
  reviewsById: Map<number, ApprovalChecklistReview>
}

const ApprovalChecklistContext =
  createContext<ApprovalChecklistContextValue | null>(null)

function useApprovalChecklist(): ApprovalChecklistContextValue {
  const ctx = use(ApprovalChecklistContext)
  if (!ctx) {
    throw new Error(
      'ApprovalChecklist subcomponents must be rendered within ApprovalChecklistCard',
    )
  }
  return ctx
}

// ── Pure helpers (<50 lines each) ────────────────────────────────────────────

function formatDate(iso: string | Date): string {
  const date = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(date.getTime())) return String(iso)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDisplayStatus(
  status: string,
): 'Approved' | 'Need Revision' | 'Pending' {
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REDEFENSE') return 'Need Revision'
  return 'Pending'
}

function resolveFeedbackCounts(review: ApprovalChecklistReview | undefined): {
  comments: number
  pages: number
} | null {
  if (!review) return null
  if (review.feedback && typeof review.feedback.comments === 'number') {
    return {
      comments: review.feedback.comments,
      pages: review.feedback.pages,
    }
  }
  if (typeof review.comments === 'number' && typeof review.pages === 'number') {
    return { comments: review.comments, pages: review.pages }
  }
  return null
}

function resolveReviewedAt(
  review: ApprovalChecklistReview | undefined,
): string | null {
  if (!review) return null
  const raw = review.reviewedAt ?? review.reviewed_at ?? null
  if (raw instanceof Date) return raw.toISOString()
  if (typeof raw === 'string') return raw
  return null
}

/**
 * Whether a REDEFENSE review should reset to PENDING on new version creation.
 * Delegates to shared helper so carry-forward logic stays in one place.
 */
function willResetOnNewVersion(status: string): boolean {
  return shouldResetOnResubmission(status as DefenseReviewStatus)
}

function getStatusColor(display: 'Approved' | 'Need Revision' | 'Pending'): string {
  if (display === 'Approved') return 'text-[#16a34a]'
  if (display === 'Need Revision') return 'text-[#e11d48]'
  return 'text-[#9ea8c6]'
}

// ── Pills & badges (same visual language as DefenseDetails Panelists) ────────

function MeBadge() {
  return (
    <span className="inline-flex items-center gap-[4px] rounded-full bg-[#eef2ff] border border-[#c7d2fe] px-[7px] py-[2px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[10px] leading-[14px] text-[#4f46e5] whitespace-nowrap shrink-0">
      Me
    </span>
  )
}

function PanelPill({ role }: { role: PanelistRole }) {
  if (role === 'CHAIR') {
    return (
      <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.13)] px-[10px] py-[3px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#f59e0b] whitespace-nowrap shrink-0">
        <Crown className="size-[12px]" strokeWidth={2} />
        Panel Chair
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[rgba(112,125,255,0.07)] border border-[rgba(112,125,255,0.13)] px-[10px] py-[3px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#707dff] whitespace-nowrap shrink-0">
      <User className="size-[12px]" strokeWidth={2} />
      Panel Member
    </span>
  )
}

function ApprovedBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[rgba(22,163,74,0.08)] border border-[rgba(22,163,74,0.2)] px-[8px] py-[2px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[11px] leading-[14px] text-[#16a34a] whitespace-nowrap shrink-0">
      Approved
    </span>
  )
}

// ── Row ──────────────────────────────────────────────────────────────────────

type ChecklistRowProps = {
  panelist: ApprovalChecklistPanelist
  isFirst: boolean
  isLast: boolean
}

function ChecklistRow({ panelist, isFirst, isLast }: ChecklistRowProps) {
  const { reviewsById } = useApprovalChecklist()
  const { data: session } = useSession()
  const review = reviewsById.get(panelist.userId)
  const rawStatus = (review?.status as string) ?? 'PENDING'
  const display = getDisplayStatus(rawStatus)
  const isReadOnly = isPanelistReadOnly(rawStatus)
  // Demonstrate carry-forward guard: REDEFENSE resets to PENDING on new version.
  // Card shows current stored status; creation of the next version will reset
  // REDEFENSE via willResetOnNewVersion — keep the helper reachable for callers.
  void willResetOnNewVersion(rawStatus)
  const feedback = resolveFeedbackCounts(review)
  const reviewedAt = resolveReviewedAt(review)
  const isMe =
    session?.user?.id != null &&
    String(session.user.id) === String(panelist.userId)

  const radius = isFirst
    ? 'rounded-tl-[10px] rounded-tr-[10px]'
    : isLast
      ? 'rounded-bl-[10px] rounded-br-[10px]'
      : ''
  const border = isLast
    ? 'border border-[#e8ebf8]'
    : 'border-l border-r border-t border-[#e8ebf8]'

  const centerColor = getStatusColor(display)

  return (
    <div
      className={`bg-white ${border} ${radius} grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)] max-sm:grid-cols-1 max-sm:gap-2 items-center px-[17px] py-[6px] min-h-[61px] gap-2`}
    >
      {/* Col1: 35px avatar gradient #1e3a8a->#2d52b8 */}
      <div className="flex items-center gap-2.5 min-w-0 sm:h-[50px] w-full">
        <UserProfile
          initials={getInitials(panelist.name)}
          name={panelist.name}
          email={panelist.email}
          gradient={PANELIST_AVATAR_GRADIENT}
          avatarClassName="size-[35px]"
        />
        {isMe ? <MeBadge /> : null}
      </div>

      {/* Col2 center: Approved / Need Revision + feedback counts / Pending */}
      <div className="flex flex-col items-center justify-center sm:h-[50px] sm:px-2 min-w-0 w-full gap-[2px]">
        {display === 'Approved' ? (
          <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-center text-[#16a34a]">
            ✓ Document is approved. No need to review the future resubmissions.
          </p>
        ) : display === 'Need Revision' ? (
          <div className="flex flex-col items-center gap-[1px]">
            <span
              className={`font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-center ${centerColor}`}
            >
              Need Revision
            </span>
            {feedback ? (
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[11px] leading-[14px] text-[#9ea8c6] text-center">
                {feedback.comments} comments on {feedback.pages} pages
                {reviewedAt ? ` · Reviewed ${formatDate(reviewedAt)}` : ''}
              </span>
            ) : reviewedAt ? (
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[11px] leading-[14px] text-[#9ea8c6] text-center">
                Reviewed {formatDate(reviewedAt)}
              </span>
            ) : null}
          </div>
        ) : (
          <p
            className={`font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[12px] leading-[18px] text-center ${centerColor}`}
          >
            Pending
          </p>
        )}
      </div>

      {/* Col3 right: pill Chair amber vs Member indigo */}
      <div className="flex items-center justify-end sm:h-[50px] shrink-0 w-full sm:w-auto gap-2">
        <PanelPill role={panelist.role} />
      </div>
    </div>
  )
}

function ChecklistEmpty() {
  return (
    <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
      No panelists have been assigned yet.
    </p>
  )
}

// ── Compound parts (optional for external composition) ───────────────────────

function ChecklistHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-[18px] pt-[15px] pb-[16px] border-b border-[#f0f2fa] w-full">
      <p className="font-['Sora',sans-serif] font-bold text-[12.5px] leading-[normal] tracking-[-0.125px] text-[#1e3a8a]">
        {children ?? 'Approval Checklist'}
      </p>
    </div>
  )
}

function ChecklistGrid({ children }: { children: React.ReactNode }) {
  return <div className="w-full p-[18px]">{children}</div>
}

// ── Root Card ────────────────────────────────────────────────────────────────

/**
 * ApprovalChecklistCard — per-panelist resubmission status for the latest version.
 * Fork of DefenseDetails Panelists visual language:
 *  - 35px avatar gradient #1e3a8a->#2d52b8
 *  - pill Chair amber vs Member indigo
 *  - 2fr 2fr 1fr grid, rounded 12px shadow
 * Uses createContext + use() for composition and pure helpers <50 lines.
 */
export function ApprovalChecklistCard({
  panelists,
  reviews,
  title = 'Approval Checklist',
  className,
}: ApprovalChecklistCardProps) {
  const reviewsById = new Map<number, ApprovalChecklistReview>()
  for (const r of reviews) {
    reviewsById.set(r.panelistId, r)
  }

  const chair = panelists.find((p) => p.role === 'CHAIR') ?? null
  const members = panelists.filter((p) => p.role === 'PANEL_MEMBER')
  const ordered = chair ? [chair, ...members] : members

  // Root frame — same outer as DefenseDetails.Panelists container
  const frameClass = [
    'bg-white border border-[#e8ebf8] flex flex-col items-start overflow-clip rounded-[14px] w-full',
    'shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)]',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  if (ordered.length === 0) {
    return (
      <div className="self-start w-full min-w-0">
        <ChecklistEmpty />
      </div>
    )
  }

  return (
    <ApprovalChecklistContext value={{ reviewsById }}>
      <div className={frameClass}>
        <ChecklistHeader>{title}</ChecklistHeader>
        <ChecklistGrid>
          <div className="bg-white flex flex-col rounded-[12px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-full overflow-clip">
            {ordered.map((panelist, index) => (
              <ChecklistRow
                key={panelist.userId}
                panelist={panelist}
                isFirst={index === 0}
                isLast={index === ordered.length - 1}
              />
            ))}
          </div>
        </ChecklistGrid>
      </div>
    </ApprovalChecklistContext>
  )
}

// Compound export for flexible composition
export const ApprovalChecklist = {
  Root: ApprovalChecklistCard,
  Header: ChecklistHeader,
  Grid: ChecklistGrid,
  Row: ChecklistRow,
}

// Re-export pure helpers for version-creation callers
export { willResetOnNewVersion, getDisplayStatus, resolveFeedbackCounts, resolveReviewedAt, formatDate }
export const shouldResetReview = willResetOnNewVersion
