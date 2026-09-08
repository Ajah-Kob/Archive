import { notFound } from 'next/navigation'
import { MilestonesTab } from '@/components/my-sections/milestones/MilestonesTab'
import { getCoordinatorSectionById } from '@/lib/actions/sections'

export default async function MySectionMilestonesPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  const res = await getCoordinatorSectionById(parseInt(sectionId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  return (
    <MilestonesTab
      sectionId={payload.section.id}
      initial={payload.milestones}
      capstone1Open={!!payload.section.capstone1OpenedAt}
      capstone2Open={!!payload.section.capstone2OpenedAt}
    />
  )
}
