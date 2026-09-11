import { notFound } from 'next/navigation'
import { getCoordinatorSectionById } from '@/lib/actions/sections'
import { SectionOverviewCard } from '@/components/my-sections/overview/SectionOverviewCard'
import { AtRiskStrip, OverviewStats } from '@/components/my-sections/overview/OverviewStats'
import { PhaseGatePills } from '@/components/my-sections/overview/PhaseGatePills'

export default async function MySectionOverviewPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  const parsedId = parseInt(sectionId, 10)
  if (Number.isNaN(parsedId)) notFound()

  const res = await getCoordinatorSectionById(parsedId)
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  // Reuse getCoordinatorSectionById payload — zero extra Prisma queries.
  // section / milestones / groups / students / pendingTopics are already resolved
  // in getCoordinatorSectionData with buildMilestoneAvailability + buildJourneyRows.
  const { section, groups, milestones, pendingTopics, students: _students } = payload
  void _students

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full">
      {/* Phase gates — derived via capstone1/2OpenedAt + milestoneAvailability
          through PhaseGatePills' internal resolveSectionAvailability hard gate.
          Passing milestones ensures a locked phase never shows Open even if a
          stale per-milestone row says open (spec: resolveSectionAvailability). */}
      <PhaseGatePills
        capstone1OpenedAt={section.capstone1OpenedAt}
        capstone2OpenedAt={section.capstone2OpenedAt}
        milestones={milestones}
      />

      {/* Section identity + invite code/link (client copy via navigator.clipboard) */}
      <SectionOverviewCard section={section} />

      {/* Stats derived from section.studentsCount / groupsCount / pendingTopics */}
      <OverviewStats
        studentsCount={section.studentsCount}
        groupsCount={section.groupsCount}
        groups={groups}
        pendingTopicsCount={pendingTopics.length}
      />

      {/* Attention strip — collapsed when no risks (no adviser / needs revision / pending) */}
      <AtRiskStrip groups={groups} pendingTopicsCount={pendingTopics.length} />

      {/* Milestone grid removed per request — keep Overview focused on section + stats */}
    </div>
  )
}
