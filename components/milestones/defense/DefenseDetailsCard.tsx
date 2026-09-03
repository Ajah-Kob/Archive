'use client'

import type { DefenseSchedulePayload } from '@/lib/actions/defense'
import { DefenseDetails } from '@/components/defense/DefenseDetails'

interface DefenseDetailsCardProps {
  schedule: DefenseSchedulePayload | null
}

/**
 * Backward-compatible DefenseDetailsCard for the student milestone.
 * Composes shared DefenseDetails primitives (Root / Header / Grid / Schedule / Panelists)
 * — composition-first, no role branching. All Figma-precise styling lives in the
 * primitives under components/defense/DefenseDetails/*.
 */
export function DefenseDetailsCard({ schedule }: DefenseDetailsCardProps) {
  return (
    <DefenseDetails.Root>
      <DefenseDetails.Header>Defense Details</DefenseDetails.Header>
      <DefenseDetails.Grid>
        <DefenseDetails.Schedule schedule={schedule} />
        <DefenseDetails.Panelists
          panelists={schedule?.panelists ?? []}
          verdict={schedule?.verdict ?? 'PENDING'}
        />
      </DefenseDetails.Grid>
    </DefenseDetails.Root>
  )
}

// Re-export primitives for direct composition usage (e.g. panelist workspace)
export { DefenseDetails }
export type { DefenseDetailsCardProps }
