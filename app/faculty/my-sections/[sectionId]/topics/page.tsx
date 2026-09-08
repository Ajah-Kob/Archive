import { notFound } from 'next/navigation'
import { TopicReviewQueue } from '@/components/my-sections/topics/TopicReviewQueue'
import { getCoordinatorSectionById } from '@/lib/actions/sections'

export default async function MySectionTopicsPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  const res = await getCoordinatorSectionById(parseInt(sectionId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  return <TopicReviewQueue topics={payload.pendingTopics} />
}
