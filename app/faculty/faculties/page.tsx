import { PageLabel } from '@/components/globals/PageLabel'
import { FacultyList } from '@/components/faculty/FacultyList'

export default async function FacultyListPage() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Faculty" />
      <FacultyList />
    </section>
  )
}
