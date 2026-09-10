import { notFound } from 'next/navigation'
import { getCoordinatorSectionById } from '@/lib/actions/sections'
import { SectionOverviewCard } from '@/components/my-sections/overview/SectionOverviewCard'
import { MilestoneOverviewGrid } from '@/components/my-sections/overview/MilestoneOverviewGrid'
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

      {/* Milestone grid — Open/Locked dot + Groups working N/total.
          MilestoneAvailabilityItem.open already reflects resolveSectionAvailability;
          MilestoneOverviewGrid computes working counts as groups where
          journey row for that milestone slug != LOCKED (topic via topicStatus,
          archiving via journey row). No extra queries. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 px-1">
          <h3 className="font-heading font-bold text-[14px] leading-[21px] tracking-[-0.14px] text-[#1e3a8a]">
            Milestones
          </h3>
          <span className="font-sans font-semibold text-[12px] leading-[18px] text-[#9ea8c6]">
            {milestones.length} milestones · {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </span>
        </div>
        <MilestoneOverviewGrid milestones={milestones} groups={groups} />
      </div>
    </div>
  )
}
