'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { GroupContext } from '@/components/milestones/GroupContext'
import { useIndicatorCounts, useSuppressedCount } from '@/lib/hooks/useIndicatorCounts'
import {
  DocumentHistoryDrawer,
  type DocumentHistoryItem,
} from './DocumentHistoryDrawer'
import type { StudentDefenseSessionPayload } from '@/lib/actions/student-defense'
import type {
  DefenseDocumentInfo,
  InitialDocumentStatus,
  ResubmissionStatus,
} from './DefenseDocumentCard'

interface MilestoneDefenseHeaderProps {
  milestone: string
  data: StudentDefenseSessionPayload | null
  /** Past defenses' initial documents, loaded server-side with the page (no pop-in). */
  pastInitials?: DocumentHistoryItem[]
}

function getHistoryInitial(
  data: StudentDefenseSessionPayload | null,
): DocumentHistoryItem | null {
  if (!data) return null
  const initialSub = data.submissions.find((s) => s.isInitial) ?? null
  if (!initialSub) return null
  const verdictAt =
    (data as unknown as { verdictSubmittedAt?: string | null })
      .verdictSubmittedAt ?? null
  const stats = (
    initialSub as unknown as {
      annotationStats?: { comments: number; pages: number } | null
    }
  ).annotationStats
  return {
    info: {
      id: (initialSub as unknown as { id: number }).id,
      fileName: initialSub.fileName,
      size: initialSub.size,
      submittedAt: initialSub.dateSubmitted,
      blobUrl: initialSub.blobUrl,
      submittedByName: initialSub.submittedByName,
      version: (initialSub as unknown as { version: number }).version,
      comments: stats?.comments ?? null,
      pages: stats?.pages ?? null,
      reviewedAt: stats ? verdictAt : null,
    } as unknown as DefenseDocumentInfo,
    status: initialSub.status as InitialDocumentStatus,
  }
}

function getHistoryResubmissions(
  data: StudentDefenseSessionPayload | null,
): DocumentHistoryItem[] {
  if (!data) return []
  const verdictAt =
    (data as unknown as { verdictSubmittedAt?: string | null })
      .verdictSubmittedAt ?? null
  const resubmissions = data.submissions
    .filter((s) => !s.isInitial)
    .sort((a, b) => a.version - b.version)
  return resubmissions.map((s) => {
    const sWithStats = s as unknown as {
      annotationStats?: { comments: number; pages: number } | null
      id: number
      version: number
      reviews?: Array<{ status: string }>
    }
    const reviews = (s as unknown as { reviews?: Array<{ status: string }> }).reviews ?? []
    const approved = reviews.filter((r) => r.status === 'APPROVED').length
    const total = reviews.length || 0
    return {
      info: {
        id: sWithStats.id,
        fileName: s.fileName,
        size: s.size,
        submittedAt: s.dateSubmitted,
        blobUrl: s.blobUrl,
        submittedByName: s.submittedByName,
        version: sWithStats.version,
        comments: sWithStats.annotationStats?.comments ?? null,
        pages: sWithStats.annotationStats?.pages ?? null,
        reviewedAt: sWithStats.annotationStats
          ? verdictAt ?? s.dateSubmitted
          : null,
      } as unknown as DefenseDocumentInfo,
      status: s.status as ResubmissionStatus,
      reviews,
      approvedCount: approved,
      total,
    }
  })
}

export function MilestoneDefenseHeader({
  milestone,
  data,
  pastInitials = [],
}: MilestoneDefenseHeaderProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const initialItem = getHistoryInitial(data)
  const resubmissionItems = getHistoryResubmissions(data)
  const counts = useIndicatorCounts()

  // Resubmission badge: same predicate as DefenseTabPanel's canResubmit —
  // verdict in, no revised submission yet. Zero new queries: verdict and
  // submissions arrive in `data`.
  const resubmitRequired =
    data != null &&
    (data.verdict === 'MINOR_REVISION' || data.verdict === 'MAJOR_REVISION') &&
    data.submissions.filter((s) => !s.isInitial).length === 0
  // Defense badge: unread updates addressed to this milestone's base href
  // (verdict arrived, defense rescheduled). Clears via the notification
  // panel, which owns read state — and hides once this tab is opened.
  const unreadKey =
    milestone === 'final-defense' ? 'unreadFinalDefense' : 'unreadProposalDefense'
  const pathname = usePathname() || ''
  const base = `/student/milestone/${milestone}`
  const defenseBadge = useSuppressedCount(
    `tab:def:${milestone}`,
    counts?.[unreadKey] ?? 0,
    pathname === `${base}/defense` || pathname === base,
  )
  const resubBadge = useSuppressedCount(
    `tab:res:${milestone}`,
    resubmitRequired ? 1 : 0,
    pathname === `${base}/resubmission`,
  )

  return (
    <>
      <GroupContext
        onDocumentHistory={() => setHistoryOpen(true)}
        tabBadges={{
          defense: defenseBadge,
          resubmission: resubBadge,
        }}
      />
      <DocumentHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        initial={initialItem}
        pastInitials={pastInitials}
        resubmissions={resubmissionItems}
        milestoneSlug={milestone}
        variant="student"
      />
    </>
  )
}
