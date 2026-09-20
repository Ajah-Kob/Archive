import { PageLabel } from '@/components/globals/PageLabel'
import { FacultiesTabs } from '@/components/faculty/FacultiesTabs'
import { CoordinatorList } from '@/components/faculty/CoordinatorList'

export default async function CoordinatorListPage() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Coordinators" />
      <FacultiesTabs />
      <CoordinatorList />
    </section>
  )
}
