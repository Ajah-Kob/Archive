import { redirect } from 'next/navigation'

export default async function MySectionPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  redirect(`/faculty/my-sections/${sectionId}/overview`)
}
