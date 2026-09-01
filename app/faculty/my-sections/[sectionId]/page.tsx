import { notFound } from 'next/navigation'
import { PageLabel } from '@/components/globals/PageLabel'
import { SectionContext } from '@/components/my-sections/SectionContext'
import { MySectionStudents } from '@/components/my-sections/students/MySectionStudents'
import { MilestoneManagement } from '@/components/my-sections/progress/MilestoneManagement'
import { SectionTabs, type SectionTabKey } from '@/components/my-sections/SectionTabs'
import { ProgressOverview } from '@/components/my-sections/progress/ProgressOverview'
import { TopicReviewQueue } from '@/components/my-sections/topics/TopicReviewQueue'
import { getCoordinatorSectionById } from '@/lib/actions/sections'

export default async function MySectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { sectionId } = await params
  const { tab } = await searchParams

  const res = await getCoordinatorSectionById(parseInt(sectionId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  const { section, students, groups, pendingTopics } = payload
  const activeTab: SectionTabKey =
    tab === 'progress' || tab === 'topics' ? tab : 'students'

  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label={section.name} />

      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <SectionTabs
          activeTab={activeTab}
          pendingTopics={pendingTopics.length}
          actions={
            <SectionContext
              section={{
                id: section.id,
                name: section.name,
                hasJoinCode: section.hasJoinCode,
                joinCode: section.joinCode,
                headerColor: (section as any).headerColor ?? null,
              }}
            />
          }
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