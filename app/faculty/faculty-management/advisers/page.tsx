import { PageLabel } from '@/components/globals/PageLabel'
import { FacultiesTabs } from '@/components/faculty/FacultiesTabs'
import { FacultyList } from '@/components/faculty/FacultyList'

export default async function AdviserListPage() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Advisers" />
      <FacultiesTabs />
      <FacultyList advisersOnly />
    </section>
  )
}
