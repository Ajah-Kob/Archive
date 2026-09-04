'use client'

import type { DefenseSchedulePayload } from '@/lib/actions/defense'
import { DefenseDetails } from '@/components/defense/DefenseDetails'

interface DefenseDetailsCardProps {
  schedule: (DefenseSchedulePayload & { members?: { userId: number; name: string; email: string; image: string | null; isLeader: boolean }[] }) | null
}

function resolveMembers(
  schedule: DefenseDetailsCardProps['schedule'],
): { userId: number; name: string; email: string; image: string | null; isLeader: boolean }[] {
  if (!schedule) return []
  if (Array.isArray(schedule.members) && schedule.members.length > 0) return schedule.members
  if ('members' in schedule && Array.isArray((schedule as unknown as { members: unknown[] }).members)) {
    return (schedule as unknown as { members: { userId: number; name: string; email: string; image: string | null; isLeader: boolean }[] }).members
  }
  return []
}

/**
 * DefenseDetailsCard for student milestone + panelist workspace.
 * Composes shared DefenseDetails primitives (Root / Header / Grid / Schedule / Panelists / Members)
 * — composition-first, no role branching. Scrollable container per Figma 1493:7980 (max-h 520 + overflow-auto).
 * All Figma-precise styling lives in the primitives under components/defense/DefenseDetails/*.
 */
export function DefenseDetailsCard({ schedule }: DefenseDetailsCardProps) {
  const members = resolveMembers(schedule)
  return (
    <DefenseDetails.Root scrollable>
      <DefenseDetails.Header>Session Details</DefenseDetails.Header>
      <DefenseDetails.Grid scrollable>
        <DefenseDetails.Schedule schedule={schedule} />
        <DefenseDetails.Panelists
          panelists={schedule?.panelists ?? []}
          verdict={schedule?.verdict ?? 'PENDING'}
        />
        <DefenseDetails.Members members={members} />
      </DefenseDetails.Grid>
    </DefenseDetails.Root>
  )
}

// Re-export primitives for direct composition usage (e.g. panelist workspace)
export { DefenseDetails }
export type { DefenseDetailsCardProps }
