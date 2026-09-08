import { notFound } from 'next/navigation'
import { MySectionStudents } from '@/components/my-sections/students/MySectionStudents'
import { getCoordinatorSectionById } from '@/lib/actions/sections'

export default async function MySectionStudentsPage({
  params,
}: {
  params: Promise<{ sectionId: string }>
}) {
  const { sectionId } = await params
  const res = await getCoordinatorSectionById(parseInt(sectionId))
  const payload = res.success && res.payload ? res.payload : null
  if (!payload) notFound()

  return <MySectionStudents students={payload.students} />
}
