import { redirect } from 'next/navigation'

export default async function MySectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { sectionId } = await params
  const { tab } = await searchParams
  if (tab === 'progress') redirect(`/faculty/my-sections/${sectionId}/progress`)
  if (tab === 'topics') redirect(`/faculty/my-sections/${sectionId}/topics`)
  redirect(`/faculty/my-sections/${sectionId}/students`)
}
