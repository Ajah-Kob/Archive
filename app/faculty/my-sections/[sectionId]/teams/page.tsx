import { notFound } from 'next/navigation'
import { ProgressOverview } from '@/components/my-sections/progress/ProgressOverview'
import { getCoordinatorSectionById } from '@/lib/actions/sections'

export default async function MySectionTeamsPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  const res = await getCoordinatorSectionById(parseInt(sectionId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  const { groups } = payload

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ProgressOverview groups={groups} />
    </div>
  )
}
