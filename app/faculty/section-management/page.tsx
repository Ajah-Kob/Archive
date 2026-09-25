import { PageLabel } from '@/components/globals/PageLabel'
import SectionsOverview from '@/components/sections/main/SectionsOverview'

export default async function SectionsOverviewPage() {
  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Section Management" />
      <SectionsOverview />
    </section>
  )
}
