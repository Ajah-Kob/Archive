import { redirect } from 'next/navigation'

export default async function DefenseSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string }>
  searchParams?: Promise<{ tab?: string }>
}) {
  const { scheduleId } = await params
  const sp = searchParams ? await searchParams : {}
  if (sp?.tab === 'resubmission') redirect(`/faculty/defense/${scheduleId}/resubmission`)
  redirect(`/faculty/defense/${scheduleId}/session`)
}
