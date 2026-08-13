import { notFound, redirect } from 'next/navigation'

export default async function GroupMilestonesPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  if (!Number.isFinite(Number(groupId))) notFound()
  redirect('/milestone')
}
