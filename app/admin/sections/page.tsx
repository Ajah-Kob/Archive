import { PageLabel } from '@/components/globals/PageLabel'
import SectionsOverview from '@/components/sections/main/SectionsOverview'

export default async function AdminSectionsPage() {
  return (
    <section className="min-h-full flex flex-col">
      <PageLabel label="Sections" />
      <div className="flex-1 pb-[30px] flex flex-col min-h-0">
        <SectionsOverview />
      </div>
    </section>
  )
}