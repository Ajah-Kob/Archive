'use client'

import { EmptyState } from '@/components/ui/EmptyState'
import type { DefenseType } from '@prisma/client'

interface DefenseEmptyStateProps {
  /** Which defense type this milestone represents (Proposal or Final). */
  type: DefenseType
}

/**
 * Empty state for a defense milestone whose group has not been scheduled yet.
 * Uses the shared empty-state visual language (NoSectionIcon illustration).
 */
export function DefenseEmptyState({ type }: DefenseEmptyStateProps) {
  const isFinal = type === 'FINAL'
  return (
    <EmptyState
      heading={isFinal ? 'No Final Defense Yet' : 'No Proposal Defense Yet'}
      description={
        isFinal
          ? 'Your coordinator has not scheduled a final defense for your group yet. Once a schedule is set, you will be able to upload your defense document and track the verdict here.'
          : 'Your coordinator has not scheduled a proposal defense for your group yet. Once a schedule is set, you will be able to upload your defense document and track the verdict here.'
      }
      variant="card"
    />
  )
}
