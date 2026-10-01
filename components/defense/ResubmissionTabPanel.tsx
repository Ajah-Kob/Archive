'use client'

import { Check, Clock, TriangleAlert } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { ResubmittedDocumentCard } from './ResubmittedDocumentCard'
import { ResubmissionActivityFeed } from './ResubmissionActivityFeed'
import {
  derivePanelistResubmissionState,
  deriveResubmissionActivity,
  resolveApprovedVersion,
} from '@/lib/defense/session-helpers'
import type { DefenseSessionPayload } from '@/lib/actions/defense'

// ── Types ────────────────────────────────────────────────────────────────────

interface ResubmissionTabPanelProps {
  session: DefenseSessionPayload
}

type ResubmissionStatus = 'FOR_REVIEW' | 'NEED_REVISION' | 'APPROVED'

type SessionSubmission = DefenseSessionPayload['resubmissions'][number]

// ── Pure helpers (<50 lines each) ────────────────────────────────────────────

function formatDate(iso: string | Date | null | undefined): string | null {
  if (!iso) return null
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** The newest resubmission (isInitial === false), or null. */
function resolveLatestResubmission(session: DefenseSessionPayload): SessionSubmission | null {
  const list = session.resubmissions
  if (!list || list.length === 0) return null
  return list[list.length - 1]
}

/** The reviewing panelist's own reviewedAt for a version, for the callout date. */
function resolveMyReviewedAt(
  sub: SessionSubmission | null,
  currentUserId: number | null,
): string | null {
  if (!sub || currentUserId == null) return null
  const mine = (sub.reviews ?? []).find((r) => r.panelistId === currentUserId)
  return mine?.reviewedAt ?? null
}

type CalloutMeta = {
  Icon: typeof Clock
  boxClass: string
  iconTileClass: string
  headlineClass: string
  headline: string
}

function getResubmissionCalloutMeta(status: ResubmissionStatus): CalloutMeta {
  if (status === 'APPROVED') {
    return {
      Icon: Check,
      boxClass: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)]',
      iconTileClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.19)]',
      headlineClass: 'text-[#16a34a]',
      headline: 'Approved',
    }
  }
  if (status === 'NEED_REVISION') {
    return {
      Icon: TriangleAlert,
      boxClass: 'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)]',
      iconTileClass: 'bg-[rgba(225,29,72,0.08)] border-[rgba(225,29,72,0.19)]',
      headlineClass: 'text-[#e11d48]',
      headline: 'Need Revision',
    }
  }
  return {
    Icon: Clock,
    boxClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconTileClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.19)]',
    headlineClass: 'text-[#f59e0b]',
    headline: 'For Review',
  }
}

/**
 * The callout's supporting line — always about THIS panelist.
 *
 * No `N/M approve` counter and no mention of other panelists: the whole point is
 * that a panelist's own verdict is complete on its own, and a count made them
 * feel responsible for a peer they cannot hurry. A carried-forward approval
 * says so explicitly, since a new version inherits APPROVED without the
 * panelist having seen the new file.
 */
function buildCalloutContext(
  status: ResubmissionStatus,
  approvedVersion: number | null,
  carriedForward: boolean,
  reviewedAt: string | null,
): string {
  const dateLabel = reviewedAt ? `Reviewed ${formatDate(reviewedAt)}` : null
  if (status === 'APPROVED' && carriedForward && approvedVersion != null) {
    return dateLabel
      ? `Carried over from version ${approvedVersion} · ${dateLabel}`
      : `Carried over from version ${approvedVersion}`
  }
  if (status === 'APPROVED') {
    return dateLabel ? `Your review · ${dateLabel}` : 'Your review is recorded'
  }
  if (status === 'NEED_REVISION') {
    return dateLabel ? `Your feedback · ${dateLabel}` : 'Revision requested'
  }
  return 'Your review is not submitted yet'
}

function resolveAnnotationStats(latest: SessionSubmission | null): { comments: number; pages: number } | null {
  const ann = (latest as unknown as { annotationStats?: { comments: number; pages: number } | null })?.annotationStats
  if (ann && typeof ann.comments === 'number') return ann
  return null
}

function resolveWorkspaceHref(session: DefenseSessionPayload, latest: SessionSubmission | null): string | undefined {
  if (!latest) return undefined
  return `/faculty/defense/${session.id}/${latest.id}`
}

// ── Callout component ────────────────────────────────────────────────────────

interface ResubmissionCalloutProps {
  status: ResubmissionStatus
  /** The version this panelist approved, or null when they never have. */
  approvedVersion: number | null
  /** True when that approval was inherited from an earlier version. */
  carriedForward: boolean
  reviewedAt?: string | null
}

function ResubmissionStatusCallout({
  status,
  approvedVersion,
  carriedForward,
  reviewedAt,
}: ResubmissionCalloutProps) {
  const meta = getResubmissionCalloutMeta(status)
  const Icon = meta.Icon
  const context = buildCalloutContext(
    status,
    approvedVersion,
    carriedForward,
    reviewedAt ?? null,
  )
  return (
    <section
      aria-live="polite"
      className={`flex flex-col gap-[12px] sm:flex-row sm:items-center sm:gap-[16px] rounded-[14px] border px-[18px] py-[16px] sm:px-[22px] sm:py-[18px] ${meta.boxClass}`}
    >
      <div className="flex items-center gap-[12px] sm:gap-[16px] min-w-0 flex-1">
        <div className={`flex size-[40px] items-center justify-center rounded-[12px] border shrink-0 ${meta.iconTileClass}`}>
          <Icon className={`size-[20px] ${meta.headlineClass}`} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`font-sora text-[15px] font-bold tracking-[-0.15px] ${meta.headlineClass}`}>{meta.headline}</h2>
          <p className="pt-[3px] font-sans font-medium text-[13px] leading-[19.5px] text-[#5a6382]">{context}</p>
        </div>
      </div>
    </section>
  )
}

function NoVerdictPlaceholder() {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center p-10 text-center h-full flex-1 min-h-[400px]">
      <div className="size-12 rounded-full bg-[rgba(112,125,255,0.08)] flex items-center justify-center mb-4">
        <Clock className="size-6 text-[#707dff]" strokeWidth={1.75} />
      </div>
      <h3 className="font-heading font-bold text-[16px] leading-[24px] text-[#1e3a8a] tracking-[-0.16px] mb-2">
        Defense not completed
      </h3>
      <p className="font-sans font-medium text-[13px] leading-[21px] text-[#8a93b4] max-w-[360px]">
        Defense is not completed or has no verdict yet. Please wait for the verdict.
      </p>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

/**
 * ResubmissionTabPanel — the faculty/panelist Resubmission tab.
 *
 * Centered on the CURRENT panelist's own review, never on the panel's
 * aggregate progress. A panelist's verdict is complete on its own, so nothing
 * here implies they are waiting on a peer:
 * - Status callout: APPROVED / NEED_REVISION / FOR_REVIEW from this panelist's
 *   review alone, with "Carried over from version N" when the approval was
 *   inherited. The old `N/M approve` counter is gone for the same reason.
 * - ResubmittedDocumentCard pinned to the version THIS panelist approved, so a
 *   newer upload does not replace the file they reviewed. Newer versions stay in
 *   Document History. Falls back to the latest when they have approved nothing.
 * - ResubmissionActivityFeed replaces the Approval Checklist: a read-only
 *   timeline across every resubmission, with no waiting-on-others framing.
 *
 * gap-[16px], responsive, pure helpers.
 */
export function ResubmissionTabPanel({ session }: ResubmissionTabPanelProps) {
  // Before the early return: this hook must run on every render.
  const { data: authSession } = useSession()
  const currentUserId = authSession?.user?.id != null ? Number(authSession.user.id) : null

  if ((session as unknown as { verdict?: string })?.verdict === 'PENDING') {
    return (
      <div className="flex flex-col gap-[16px] w-full mx-auto h-full flex-1 min-h-0">
        <NoVerdictPlaceholder />
      </div>
    )
  }

  const latest = resolveLatestResubmission(session)
  const versions = session.resubmissions.map((v) => ({
    version: v.version,
    isInitial: v.isInitial,
    dateSubmitted: v.dateSubmitted,
    submittedByName: v.submittedByName,
    reviews: v.reviews,
  }))

  // Everything below is about THIS panelist only. The previous derivation was
  // collective — `some(PENDING)` forced FOR_REVIEW on everyone, so a panelist
  // who had already approved still saw a waiting state because a peer had not
  // acted. Their own verdict is complete on its own.
  const myState = derivePanelistResubmissionState(currentUserId, versions)
  const status: ResubmissionStatus = myState.status

  // Pin the card to the version this panelist approved, so a newer upload does
  // not replace the file they actually reviewed. Falls back to the latest.
  const approvedSub = resolveApprovedVersion(session.resubmissions, myState.approvedVersion)
  const shownSub = approvedSub ?? latest
  const myReviewedAt = resolveMyReviewedAt(approvedSub, currentUserId)

  // Read-only guard for the Open action: a resolved verdict means no re-review.
  const isCurrentReadOnly = status === 'APPROVED' || status === 'NEED_REVISION'

  const annotationStats = resolveAnnotationStats(shownSub)
  const activity = deriveResubmissionActivity(versions)

  const shownDoc = shownSub
    ? {
        fileName: shownSub.fileName,
        size: shownSub.size,
        blobUrl: shownSub.blobUrl,
        dateSubmitted: shownSub.dateSubmitted,
        submittedByName: shownSub.submittedByName || session.groupName,
        version: shownSub.version,
        isInitial: shownSub.isInitial,
        annotationStats,
        comments: annotationStats?.comments ?? null,
        pages: annotationStats?.pages ?? null,
        reviewedAt: myReviewedAt,
      }
    : null

  const workspaceHref = resolveWorkspaceHref(session, shownSub)

  return (
    <div className="flex flex-col gap-[16px] w-full mx-auto">
      {latest ? (
        <ResubmissionStatusCallout
          status={status}
          approvedVersion={myState.approvedVersion}
          carriedForward={myState.carriedForward}
          reviewedAt={myReviewedAt}
        />
      ) : null}

      <ResubmittedDocumentCard
        document={shownDoc as unknown as never}
        myStatus={status}
        comments={annotationStats?.comments ?? null}
        pages={annotationStats?.pages ?? null}
        reviewedAt={myReviewedAt}
        workspaceHref={workspaceHref}
        hasApprovedPrevious={isCurrentReadOnly}
      />

      <ResubmissionActivityFeed entries={activity} versions={versions} />
    </div>
  )
}

export default ResubmissionTabPanel
