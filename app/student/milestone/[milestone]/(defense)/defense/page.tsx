import { notFound } from 'next/navigation'
import { getDefenseSessionData } from '@/lib/actions/student-defense'
import { DefenseTabPanel } from '@/components/milestones/defense/tabs/DefenseTabPanel'

const DEFENSE_SLUGS: readonly string[] = ['proposal-defense', 'final-defense']

function resolveDefenseType(milestone: string): 'PROPOSAL' | 'FINAL' {
  return milestone === 'final-defense' ? 'FINAL' : 'PROPOSAL'
}

interface DefensePageProps {
  params: Promise<{ milestone: string }>
}

/**
 * Defense tab — server component fetching via defenseType.
 * Shared for both proposal-defense and final-defense via defenseType prop (DRY).
 * Shows initial-only doc with VerdictCallout + MilestoneDefenseDetailsCard;
 * resubmitted docs are hidden (defense-tab filter isInitial). Drawer accessible
 * via GroupContext in DefenseTabPanel.
 */
export default async function DefensePage({ params }: DefensePageProps) {
  const { milestone } = await params

  if (!(DEFENSE_SLUGS as readonly string[]).includes(milestone)) notFound()

  const defenseType = resolveDefenseType(milestone)
  const res = await getDefenseSessionData(defenseType)
  const data = res.success && res.payload ? res.payload : null

  return <DefenseTabPanel data={data} defenseType={defenseType} />
}
