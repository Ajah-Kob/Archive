import { notFound } from 'next/navigation'
import { getDefenseSessionData } from '@/lib/actions/student-defense'
import {
  getSystemLinkCommentsForStudent,
  getSystemLinksForStudent,
} from '@/lib/actions/system-links'
import { StudentSystemCard } from '@/components/milestones/defense/StudentSystemCard'
import type { PanelistSystemComment } from '@/components/defense/system/SystemCommentsCard'

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
 * Server-fetches links and comments so the student sees everything immediately
 * on tab open with no client-side loading flash.
 *
 * Renders nothing when the defense is unscheduled, matching the rule that the
 * feature does not exist for a student before their defense has a date.
 */
export default async function SystemPage({ params }: SystemPageProps) {
  const { milestone } = await params

  if (!(DEFENSE_SLUGS as readonly string[]).includes(milestone)) notFound()

  const defenseType = resolveDefenseType(milestone)
  const res = await getDefenseSessionData(defenseType)
  const data = res.success && res.payload ? res.payload : null

  if (!data) return null

  const linksRes = await getSystemLinksForStudent(data.id)
  const links = linksRes.success ? (linksRes.payload?.links ?? []) : []

  const threads = await Promise.all(
    links.map((link) => getSystemLinkCommentsForStudent(link.id)),
  )

  const commentsByLink: Record<number, PanelistSystemComment[]> = {}
  links.forEach((link, i) => {
    const t = threads[i]
    commentsByLink[link.id] = t.success
      ? ((t.payload?.comments ?? []) as unknown as PanelistSystemComment[])
      : []
  })

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-[30px] sm:px-8">
      <StudentSystemCard
        scheduleId={data.id}
        verdict={String(data.verdict)}
        defenseLabel={
          defenseType === 'FINAL' ? 'final defense' : 'proposal defense'
        }
        initialLinks={links}
        initialCommentsByLink={commentsByLink}
      />
    </div>
  )
}
