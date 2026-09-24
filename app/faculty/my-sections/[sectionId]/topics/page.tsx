import { redirect } from 'next/navigation'

// Topic Reviews retired — single final topic lives on the student group card.
export default async function MySectionTopicsPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  redirect(`/faculty/my-sections/${sectionId}/overview`)
}
