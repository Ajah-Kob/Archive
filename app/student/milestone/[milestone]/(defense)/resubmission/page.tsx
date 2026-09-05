import { notFound } from 'next/navigation'
import { getDefenseSessionData } from '@/lib/actions/student-defense'
import { ResubmissionTabPanel } from '@/components/milestones/defense/tabs/ResubmissionTabPanel'

const DEFENSE_SLUGS: readonly string[] = ['proposal-defense', 'final-defense']

function resolveDefenseType(milestone: string): 'PROPOSAL' | 'FINAL' {
  return milestone === 'final-defense' ? 'FINAL' : 'PROPOSAL'
}

interface ResubmissionPageProps {
  params: Promise<{ milestone: string }>
}

/**
 * Resubmission tab — server component fetching via defenseType.
 * Shared for both proposal-defense and final-defense via defenseType prop (DRY).
 * Shows status callout + resubmitted document card + student checklist
 * per defenseType; empty placeholder when no resubmission. Drawer accessible
 * via GroupContext in ResubmissionTabPanel.
 */
export default async function ResubmissionPage({ params }: ResubmissionPageProps) {
  const { milestone } = await params

  if (!(DEFENSE_SLUGS as readonly string[]).includes(milestone)) notFound()

  const defenseType = resolveDefenseType(milestone)
  const res = await getDefenseSessionData(defenseType)
  const data = res.success && res.payload ? res.payload : null

  return <ResubmissionTabPanel data={data} defenseType={defenseType} milestone={milestone} />
}
