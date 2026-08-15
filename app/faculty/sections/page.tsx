import { PageLabel } from '@/components/globals/PageLabel'
import SectionsOverview from '@/components/sections/main/SectionsOverview'

export default async function FacultySectionsPage() {
  return (
    <section className="min-h-full flex flex-col pt-[30px] px-[30px] pb-[30px]">
      <PageLabel label="Sections" />
      <div className="flex-1 mt-3 flex flex-col min-h-0">
        <SectionsOverview />
      </div>
    </section>
  )
}