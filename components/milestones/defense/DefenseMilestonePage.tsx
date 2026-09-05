'use client'

import type { StudentDefenseSessionPayload } from '@/lib/actions/student-defense'
import type { DefenseType } from '@prisma/client'
import { DefenseTabPanel } from './tabs/DefenseTabPanel'

interface DefenseMilestonePageProps {
  data: StudentDefenseSessionPayload | null
  defenseType: DefenseType
}

/**
 * Client wrapper for the defense milestone — legacy entry point.
 * Now delegates to DefenseTabPanel (initial-only filtered card +
 * VerdictCallout + MilestoneDefenseDetailsCard) so behavior stays
 * consistent with the /defense segment route. Preserves the same
 * canResubmit rule (MINOR|MAJOR && no resubmission) and carry-forward
 * semantics via the shared DefenseTabPanel. Drawer remains accessible
 * via GroupContext inside DefenseTabPanel.
 */
export function DefenseMilestonePage({ data, defenseType }: DefenseMilestonePageProps) {
  return <DefenseTabPanel data={data} defenseType={defenseType} />
}
