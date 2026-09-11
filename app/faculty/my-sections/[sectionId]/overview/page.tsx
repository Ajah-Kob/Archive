import { notFound } from 'next/navigation'
import { getCoordinatorSectionById } from '@/lib/actions/sections'
import { SectionOverviewCard } from '@/components/my-sections/overview/SectionOverviewCard'

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

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full">
      <SectionOverviewCard section={section} />
    </div>
  )
}
