import { notFound, redirect } from 'next/navigation'

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; milestone: string }>
}) {
  const { groupId, milestone } = await params
  if (!Number.isFinite(Number(groupId))) notFound()
  if (!milestone) notFound()
  redirect(`/milestone/${milestone}`)
}

