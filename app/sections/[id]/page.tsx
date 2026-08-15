import { notFound } from 'next/navigation'
import { SectionContext } from '@/components/my-sections/SectionContext'
import { MySectionStudents } from '@/components/my-sections/MySectionStudents'
import { MilestoneManagement } from '@/components/my-sections/MilestoneManagement'
import { SectionTabs, type SectionTabKey } from '@/components/my-sections/SectionTabs'
import { ProgressOverview } from '@/components/my-sections/progress/ProgressOverview'
import { TopicReviewQueue } from '@/components/my-sections/topics/TopicReviewQueue'
import { getCoordinatorSectionById } from '@/lib/actions/sections'

export default async function SectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams

  const res = await getCoordinatorSectionById(parseInt(id))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  const { section, students, groups, pendingTopics } = payload
  const activeTab: SectionTabKey =
    tab === 'progress' || tab === 'topics' ? tab : 'students'

  return (
    <section className="min-h-full flex flex-col">
      <SectionContext
        section={{
          id: section.id,
          name: section.name,
          hasJoinCode: section.hasJoinCode,
          joinCode: section.joinCode,
        }}
      />

      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <SectionTabs
          activeTab={activeTab}
          pendingTopics={pendingTopics.length}
          studentsPanel={<MySectionStudents students={students} />}
          progressPanel={
            <div className="flex flex-col xl:flex-row gap-[16px] flex-1 min-h-0">
              <div className="shrink-0 min-w-0 xl:w-[400px]">
                <MilestoneManagement
                  sectionId={section.id}
                  initial={payload.milestones}
                />
              </div>
              <div className="flex-1 min-h-0 min-w-0 flex flex-col">
                <ProgressOverview groups={groups} />
              </div>
            </div>
          }
          topicsPanel={<TopicReviewQueue topics={pendingTopics} />}
        />
      </div>
    </section>
  )
}