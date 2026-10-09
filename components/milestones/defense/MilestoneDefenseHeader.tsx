'use client'

import { useState } from 'react'
import { GroupContext } from '@/components/milestones/GroupContext'
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

  return (
    <>
      <GroupContext onDocumentHistory={() => setHistoryOpen(true)} />
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
