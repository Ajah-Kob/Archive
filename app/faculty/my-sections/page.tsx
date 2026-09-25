import { PageLabel } from '@/components/globals/PageLabel'
import { MySectionsPage } from '@/components/my-sections/MySectionsPage'
import { getCoordinatorSections } from '@/lib/actions/sections'

// Assigned-Coordinator-only scope (DB-backed via getCoordinatorSections):
// only live sections owned by the current coordinator; unassigned rows never
// appear. Card-only list with no create and no View Details/global details path.
export default async function MySectionsOverviewPage() {
  const res = await getCoordinatorSections()
  const sections = res.success && res.payload ? res.payload : []

  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label="My Sections" />

      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <MySectionsPage initialSections={sections} />
      </div>
    </section>
  )
}
