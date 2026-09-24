import { redirect } from 'next/navigation'

// Progress renamed to Teams — single final topic lives on the group card.
export default async function MySectionProgressPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  redirect(`/faculty/my-sections/${sectionId}/teams`)
}
