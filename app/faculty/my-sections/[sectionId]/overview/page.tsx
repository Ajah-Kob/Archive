import { notFound } from 'next/navigation'
import { getCoordinatorSectionById } from '@/lib/actions/sections'
import { getSectionActivityFeed } from '@/lib/actions/section-activity'
import { SectionOverviewCard } from '@/components/my-sections/overview/SectionOverviewCard'
import { SectionActivityFeed } from '@/components/my-sections/overview/SectionActivityFeed'

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
  const { section } = payload

  // Fetch the feed server-side: the page already has the session context, and
  // a client-side action call hangs under cacheComponents. Pass entries down.
  const activityRes = await getSectionActivityFeed(parsedId)
  const entries = activityRes.success && activityRes.payload ? activityRes.payload : null

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full">
      <SectionOverviewCard section={section} />
      <SectionActivityFeed entries={entries} />
    </div>
  )
}
