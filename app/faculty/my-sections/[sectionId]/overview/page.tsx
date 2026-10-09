import { notFound } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { getCoordinatorSectionById } from '@/lib/actions/sections'
import { SectionOverviewCard } from '@/components/my-sections/overview/SectionOverviewCard'
import { SectionActivityFeed } from '@/components/my-sections/overview/SectionActivityFeed'

export default async function MySectionOverviewPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  // Opt out of static prerendering — the page uses session-gated data and
  // server actions that call headers(), which is forbidden in a prerender
  // scope. With cacheComponents enabled, unstable_noStore() is the correct
  // way to mark this page as dynamic.
  unstable_noStore()

  const { sectionId } = await params
  const parsedId = parseInt(sectionId, 10)
  if (Number.isNaN(parsedId)) notFound()

  const res = await getCoordinatorSectionById(parsedId)
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  // Reuse getCoordinatorSectionById payload — zero extra Prisma queries.
  const { section } = payload

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full">
      <SectionOverviewCard section={section} />
      <SectionActivityFeed sectionId={parsedId} />
    </div>
  )
}
