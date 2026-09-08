import { notFound } from 'next/navigation'
import { MilestoneManagement } from '@/components/my-sections/progress/MilestoneManagement'
import { ProgressOverview } from '@/components/my-sections/progress/ProgressOverview'
import { getCoordinatorSectionById } from '@/lib/actions/sections'

export default async function MySectionProgressPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  const res = await getCoordinatorSectionById(parseInt(sectionId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  const { section, groups } = payload

  return (
    <div className="flex flex-col xl:flex-row gap-[16px] flex-1 min-h-0">
      <div className="shrink-0 min-w-0 xl:w-[400px]">
        <MilestoneManagement sectionId={section.id} initial={payload.milestones} />
      </div>
      <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <ProgressOverview groups={groups} />
      </div>
    </div>
  )
}
