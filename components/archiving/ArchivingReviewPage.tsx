'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ArchivingReviewItem } from '@/lib/actions/archiving'
import { ChairReviewTable } from './ChairReviewTable'
import { ChairReviewDetailModal } from './ChairReviewDetailModal'

interface ArchivingReviewPageProps {
  submissions: ArchivingReviewItem[]
}

/**
 * Client orchestrator for /faculty/archiving.
 * Owns selected submission state and wires the table + detail modal together.
 * Mirrors DefenseSchedulingPage pattern: server page fetches, client handles
 * view/approve interactions and router.refresh() after mutations so the server
 * props stay DERIVED from DB (refresh preserves state, removed members stay).
 */
export function ArchivingReviewPage({ submissions }: ArchivingReviewPageProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<ArchivingReviewItem | null>(null)

  function handleView(item: ArchivingReviewItem) {
    setSelected(item)
  }

  function handleApproveFromTable(item: ArchivingReviewItem) {
    // Open detail modal with approve focus — user confirms there
    setSelected(item)
  }

  function handleClose() {
    setSelected(null)
  }

  function handleApproved() {
    // After approveArchiving succeeds, the modal already calls router.refresh()
    // We also ensure local selection is cleared; next server render will show ARCHIVED badge.
    setSelected(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        <ChairReviewTable
          submissions={submissions}
          onView={handleView}
          onApprove={handleApproveFromTable}
        />
      </div>

      <ChairReviewDetailModal
        submission={selected}
        onClose={handleClose}
        onApproved={handleApproved}
      />
    </>
  )
}

// Re-export table/modal for direct imports (spec compatibility)
export { ChairReviewTable } from './ChairReviewTable'
export { ChairReviewDetailModal } from './ChairReviewDetailModal'
