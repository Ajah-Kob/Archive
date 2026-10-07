import { notFound } from 'next/navigation'
import { getDefenseSessionData } from '@/lib/actions/student-defense'
import { StudentSystemCard } from '@/components/milestones/defense/StudentSystemCard'

const DEFENSE_SLUGS: readonly string[] = ['proposal-defense', 'final-defense']

function resolveDefenseType(milestone: string): 'PROPOSAL' | 'FINAL' {
  return milestone === 'final-defense' ? 'FINAL' : 'PROPOSAL'
}

interface SystemPageProps {
  params: Promise<{ milestone: string }>
}

/**
 * System tab — the links the group submitted for this defense (GitHub, Figma, a
 * hosted build) plus the panelist discussion on them.
 *
 * Separate from the Defense tab because the two have different jobs: Defense is
 * the document and the verdict, System is the built artifact and what the panel
 * said about it. Mixing them buried the links under the document card.
 *
 * Renders nothing when the defense is unscheduled, matching the rule that the
 * feature does not exist for a student before their defense has a date -- not a
 * disabled card, no card at all.
 */
export default async function SystemPage({ params }: SystemPageProps) {
  const { milestone } = await params

  if (!(DEFENSE_SLUGS as readonly string[]).includes(milestone)) notFound()

  const defenseType = resolveDefenseType(milestone)
  const res = await getDefenseSessionData(defenseType)
  const data = res.success && res.payload ? res.payload : null

  // No schedule yet -> the card does not exist for this student.
  if (!data) return null

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-8 py-[30px]">
      <StudentSystemCard
        scheduleId={data.id}
        verdict={String(data.verdict)}
        defenseLabel={
          defenseType === 'FINAL' ? 'final defense' : 'proposal defense'
        }
      />
    </div>
  )
}